const { REWARD_INPUT, MINNING_REWARD } = require("../config");
const { verifySignature } = require("../util");
const Wallet = require("./index");
const Transaction = require("./transaction");

describe("Transacion", () => {
    let transaction, senderWallet, recipient, amount;

    beforeEach(() => {
        senderWallet = new Wallet();
        recipient = "recipient-public-key";
        amount = 50;
        transaction = new Transaction({ senderWallet, recipient, amount });
    });

    it("has an 'id'", () => {
        expect(transaction).toHaveProperty("id");
    });

    describe("outPutMap", () => {
        it("has an 'outPutMap'", () => {
            expect(transaction).toHaveProperty("outputMap");
        });

        it("Outputs the amount to the recipient", () => {
            expect(transaction.outputMap[recipient]).toEqual(amount);
        });

        it("Outputs the remainig balance for the 'senderWallet'", () => {
            expect(transaction.outputMap[senderWallet.publicKey]).
                toEqual(senderWallet.balance - amount);
        });
    });

    describe("inputs ", () => {
        it("has an 'input'", () => {
            expect(transaction).toHaveProperty('input');
        });

        it("has an 'timestamp' in the input", () => {
            expect(transaction.input).toHaveProperty('timestamp');
        });

        it("sets the 'amount' to the 'snderWallet' balance", () => {
            expect(transaction.input.amount).toEqual(senderWallet.balance);
        });

        it("sets the 'address' to the 'senderWallet' publicKey", () => {
            expect(transaction.input.address).toEqual(senderWallet.publicKey);
        });

        it("sign the input", () => {
            expect(
                verifySignature({
                    publicKey: senderWallet.publicKey,
                    data: transaction.outputMap,
                    signature: transaction.input.signature
                })).toBe(true);
        });
    });

    describe("validTransaction() ", () => {
        describe("When the transaction is valid", () => {
            it("returns true", () => {
                expect(Transaction.validTransaction(transaction)).toBe(true);
            });
        });

        describe("When the transaction is invalid", () => {
            let errorMock;

            beforeEach(() => {
                errorMock = jest.fn();
                global.console.error = errorMock;
            });

            describe("and a transaction outputMap value is invalid", () => {
                it("returns false and logs an errors", () => {

                    transaction.outputMap[senderWallet.publicKey] = 9999;

                    expect(Transaction.validTransaction(transaction)).toBe(false);
                    expect(errorMock).toHaveBeenCalled();
                });
            });

            describe("and a transaction input signature is invalid", () => {
                it("returns false and logs an errors", () => {

                    transaction.input.signature = new Wallet().sign("data");

                    expect(Transaction.validTransaction(transaction)).toBe(false);
                    expect(errorMock).toHaveBeenCalled();
                });
            });

        });
    });

    describe("update()", () => {
        let originalSignature, originalSenderOutput, nextRecipient, nextAmount;

        describe("and the amount is invalid", () => {
            it("thros an error", () => {
                expect(() => {
                    transaction.update({
                        senderWallet, recipient: "FooData", amount: 99999999
                    })
                }).toThrow("Amount exceeds the balance");
            });
        });

        describe("and the amount is valid", () => {
            beforeEach(() => {
                originalSignature = transaction.input.signature;
                originalSenderOutput = transaction.outputMap[senderWallet.publicKey];
                nextRecipient = "next-recipient";
                nextAmount = 55;

                transaction.update({
                    senderWallet,
                    recipient: nextRecipient,
                    amount: nextAmount
                });
            });

            it("outputs the amount to the next recipient", () => {
                expect(transaction.outputMap[nextRecipient]).toEqual(nextAmount);
            });


            it("subtracts the amount from the original sender output amount", () => {
                expect(transaction.outputMap[senderWallet.publicKey]).toEqual(originalSenderOutput - nextAmount);
            });

            it("maintains a total output that still matches the input amount", () => {
                expect(
                    Object.values(transaction.outputMap)
                        .reduce((total, outputAmount) => total + outputAmount)
                ).toEqual(transaction.input.amount);
            });

            it("re-signs the transaction", () => {
                expect(transaction.input.signature).not.toEqual(originalSignature);
            });

            describe("and another update for the same recipient", () => {
                let addedAmount;

                beforeEach(() => {
                    addedAmount = 88;
                    transaction.update({
                        senderWallet,
                        recipient: nextRecipient,
                        amount: addedAmount
                    });
                });

                it("adds to the recipient amount", () => {
                    expect(transaction.outputMap[nextRecipient]).toEqual(nextAmount + addedAmount);
                });

                it("substracts the amount from the original sender output amount", () => {
                    expect(transaction.outputMap[senderWallet.publicKey])
                        .toEqual(originalSenderOutput - nextAmount - addedAmount);
                });

            });
        });
    });

    describe("rewardTransaction()", () => {
        let rewardTransaction, minerWallet;

        beforeEach(() => {
            minerWallet = new Wallet();
            rewardTransaction = Transaction.rewardTransaction({ minerWallet });
        })

        it("creates a transaction with the reward input", () => {
            expect(rewardTransaction.input).toEqual(REWARD_INPUT);
        });
        it("creates ones transaction for the miner with the 'MINNING_REWARD'", () => {
            expect(rewardTransaction.outputMap[minerWallet.publicKey]).toEqual(MINNING_REWARD);
        });

    });

});

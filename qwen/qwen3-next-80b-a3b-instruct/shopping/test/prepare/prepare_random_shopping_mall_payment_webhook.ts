import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPaymentWebhook } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentWebhook";
import { IShoppingMallPaymentWebhookPayload } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentWebhookPayload";
import { IShoppingMallPaymentWebhookCardPayload } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentWebhookCardPayload";
import { IShoppingMallPaymentWebhookMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentWebhookMetadata";
export function prepare_random_shopping_mall_payment_webhook(
  input?: DeepPartial<IShoppingMallPaymentWebhook.ICreate>,
): IShoppingMallPaymentWebhook.ICreate {
  return {
    event_type:
      input?.event_type ??
      RandomGenerator.pick([
        "payment.succeeded",
        "payment.failed",
        "refund.processed",
        "dispute.created",
        "invoice.payment_succeeded",
      ] as const),
    event_id: typia.random<string & tags.Format<"uuid">>(),
    payment_intent_id: typia.random<string & tags.Format<"uuid">>(),
    payment_id:
      input?.payment_id ??
      (RandomGenerator.pick([true, false] as const)
        ? typia.random<string & tags.Format<"uuid">>()
        : undefined),
    transaction_id:
      input?.transaction_id ??
      (RandomGenerator.pick([true, false] as const)
        ? typia.random<string & tags.Format<"uuid">>()
        : undefined),
    amount:
      input?.amount ??
      typia.random<number & tags.Minimum<0> & tags.Maximum<999999999.99>>(),
    currency:
      input?.currency ??
      RandomGenerator.pick(["USD", "EUR", "JPY", "GBP", "CAD", "AUD"] as const),
    signature: input?.signature ?? RandomGenerator.alphaNumeric(64),
    payload: input?.payload
      ? {
          amount:
            input.payload.amount ??
            typia.random<
              number & tags.Minimum<0> & tags.Maximum<999999999.99>
            >(),
          currency:
            input.payload.currency ??
            RandomGenerator.pick(["USD", "EUR", "JPY", "GBP"] as const),
          payment_method:
            input.payload.payment_method ??
            RandomGenerator.pick([
              "card",
              "paypal",
              "apple_pay",
              "google_pay",
              "bank_transfer",
            ] as const),
          card: input.payload.card
            ? {
                brand:
                  input.payload.card.brand ??
                  RandomGenerator.pick([
                    "visa",
                    "mastercard",
                    "amex",
                    "discover",
                  ] as const),
                last4:
                  input.payload.card.last4 ?? RandomGenerator.alphaNumeric(4),
                funding:
                  input.payload.card.funding ??
                  RandomGenerator.pick(["credit", "debit", "prepaid"] as const),
                country:
                  input.payload.card.country ??
                  RandomGenerator.pick([
                    "US",
                    "GB",
                    "JP",
                    "CA",
                    "DE",
                    "AU",
                  ] as const),
              }
            : {
                brand: RandomGenerator.pick([
                  "visa",
                  "mastercard",
                  "amex",
                  "discover",
                ] as const),
                last4: RandomGenerator.alphaNumeric(4),
                funding: RandomGenerator.pick([
                  "credit",
                  "debit",
                  "prepaid",
                ] as const),
                country: RandomGenerator.pick([
                  "US",
                  "GB",
                  "JP",
                  "CA",
                  "DE",
                  "AU",
                ] as const),
              },
          metadata: input.payload.metadata
            ? (input.payload.metadata as Record<string, any>)
            : {},
          description:
            input.payload.description ??
            RandomGenerator.paragraph({
              sentences: typia.random<
                number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
              >(),
              wordMin: 3,
              wordMax: 8,
            }),
        }
      : {
          amount: typia.random<
            number & tags.Minimum<0> & tags.Maximum<999999999.99>
          >(),
          currency: RandomGenerator.pick(["USD", "EUR", "JPY", "GBP"] as const),
          payment_method: RandomGenerator.pick([
            "card",
            "paypal",
            "apple_pay",
            "google_pay",
            "bank_transfer",
          ] as const),
          card: {
            brand: RandomGenerator.pick([
              "visa",
              "mastercard",
              "amex",
              "discover",
            ] as const),
            last4: RandomGenerator.alphaNumeric(4),
            funding: RandomGenerator.pick([
              "credit",
              "debit",
              "prepaid",
            ] as const),
            country: RandomGenerator.pick([
              "US",
              "GB",
              "JP",
              "CA",
              "DE",
              "AU",
            ] as const),
          },
          metadata: {},
          description: RandomGenerator.paragraph({
            sentences: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
            >(),
            wordMin: 3,
            wordMax: 8,
          }),
        },
    gateway:
      input?.gateway ??
      RandomGenerator.pick([
        "stripe",
        "paypal",
        "adyen",
        "square",
        "checkout_com",
        "worldpay",
      ] as const),
    timestamp: typia.random<string & tags.Format<"date-time">>(),
  };
}

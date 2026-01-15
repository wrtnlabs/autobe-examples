import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderPayment";
import { ICommunityPlatformOrderPaymentMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderPaymentMetadata";
export function prepare_random_community_platform_order_payment(
  input?: DeepPartial<ICommunityPlatformOrderPayment.ICreate> | undefined,
): ICommunityPlatformOrderPayment.ICreate {
  return {
    amount:
      input?.amount ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<5000>
      >(),
    method:
      input?.method ??
      RandomGenerator.pick([
        "credit_card",
        "debit_card",
        "paypal",
        "bank_transfer",
        "wallet",
      ] as const),
    currency:
      input?.currency ?? typia.random<string & tags.Pattern<"^[A-Z]{3}$">>(),
    metadata:
      input?.metadata ??
      JSON.stringify({
        promoCode: RandomGenerator.alphaNumeric(8),
        merchantId: RandomGenerator.alphaNumeric(12),
        transactionContext: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 10,
        }),
      }),
  };
}

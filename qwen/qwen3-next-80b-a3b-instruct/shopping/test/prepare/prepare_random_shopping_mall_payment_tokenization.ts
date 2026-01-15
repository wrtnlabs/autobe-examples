import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPaymentTokenization } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTokenization";
export function prepare_random_shopping_mall_payment_tokenization(
  input?: DeepPartial<IShoppingMallPaymentTokenization.ICreate>,
): IShoppingMallPaymentTokenization.ICreate {
  return {
    payment_method_type:
      input?.payment_method_type ??
      RandomGenerator.pick([
        "credit_card",
        "debit_card",
        "digital_wallet",
      ] as const),
    encrypted_data: input?.encrypted_data ?? RandomGenerator.alphaNumeric(72),
    masked_payment_info:
      input?.masked_payment_info ??
      (() => {
        const lastFour = typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<9999>
        >();
        const typeName = {
          credit_card: "Visa Card",
          debit_card: "Mastercard",
          digital_wallet: "Digital Wallet",
        }[
          input?.payment_method_type ??
            RandomGenerator.pick([
              "credit_card",
              "debit_card",
              "digital_wallet",
            ] as const)
        ];
        return `****-****-****-${lastFour} (${typeName})`;
      })(),
    expiration_date:
      input?.expiration_date ??
      (() => {
        const year = typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<2024> & tags.Maximum<2033>
        >();
        const month = typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<12>
        >();
        return `${year}-${month.toString().padStart(2, "0")}`;
      })(),
  };
}

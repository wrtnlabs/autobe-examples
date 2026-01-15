import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPaymentVaultEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentVaultEntry";
import { IShoppingMallPaymentVaultEntryMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentVaultEntryMetadata";
export function prepare_random_shopping_mall_payment_vault_entry(
  input?: DeepPartial<IShoppingMallPaymentVaultEntry.ICreate> | undefined,
): IShoppingMallPaymentVaultEntry.ICreate {
  return {
    payment_method_type:
      input?.payment_method_type ??
      RandomGenerator.pick([
        "credit_card",
        "digital_wallet",
        "crypto_currency",
      ] as const),
    tokenized_data:
      input?.tokenized_data ??
      typia.random<string & tags.Pattern<"^[a-zA-Z0-9-_]{32,}$">>(),
    last_four: input?.last_four ?? RandomGenerator.alphaNumeric(4),
    nickname:
      input?.nickname ??
      RandomGenerator.name(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<2>
        >(),
      ),
    is_default:
      input?.is_default ?? RandomGenerator.pick([true, false] as const),
    metadata:
      input?.metadata ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 6 }),
    customer_id:
      input?.customer_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallPaymentVaultEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentVaultEntry";
import type { IShoppingMallPaymentVaultEntryMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentVaultEntryMetadata";
import { prepare_random_shopping_mall_payment_vault_entry } from "../prepare/prepare_random_shopping_mall_payment_vault_entry";
export async function generate_random_shopping_mall_customer_payment_vault_entries_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallPaymentVaultEntry.ICreate> | undefined;
  },
): Promise<IShoppingMallPaymentVaultEntry> {
  const prepared: IShoppingMallPaymentVaultEntry.ICreate =
    prepare_random_shopping_mall_payment_vault_entry(props.body);
  return await api.functional.shoppingMall.customer.payment_vault_entries.create(
    connection,
    {
      body: prepared,
    },
  );
}

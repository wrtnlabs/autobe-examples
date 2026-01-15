import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSellerBankAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerBankAccount";
import { prepare_random_shopping_mall_seller_bank_account } from "../prepare/prepare_random_shopping_mall_seller_bank_account";
export async function generate_random_shopping_mall_seller_sellers_bank_accounts_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSellerBankAccount.ICreate> | undefined;
    params: {
      sellerId: string;
    };
  },
): Promise<IShoppingMallSellerBankAccount> {
  const prepared: IShoppingMallSellerBankAccount.ICreate =
    prepare_random_shopping_mall_seller_bank_account(props.body);
  return await api.functional.shoppingMall.seller.sellers.bank_accounts.create(
    connection,
    {
      body: prepared,
      sellerId: props.params.sellerId,
    },
  );
}

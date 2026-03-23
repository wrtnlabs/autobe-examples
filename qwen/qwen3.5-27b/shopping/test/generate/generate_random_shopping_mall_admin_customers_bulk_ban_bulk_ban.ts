import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomerBulkBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerBulkBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_customer_bulk_ban } from "../prepare/prepare_random_shopping_mall_customer_bulk_ban";

export async function generate_random_shopping_mall_admin_customers_bulk_ban_bulk_ban(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallCustomerBulkBan.ICreate> | undefined;
  },
): Promise<IShoppingMallCustomerBulkBan.IResult> {
  const prepared: IShoppingMallCustomerBulkBan.ICreate =
    prepare_random_shopping_mall_customer_bulk_ban(props.body);
  return await api.functional.shoppingMall.admin.customers.bulk_ban.bulkBan(
    connection,
    {
      body: prepared,
    },
  );
}

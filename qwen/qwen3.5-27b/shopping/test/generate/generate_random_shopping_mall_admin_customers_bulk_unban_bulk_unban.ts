import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomerBulkUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerBulkUnban";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_customer_bulk_unban } from "../prepare/prepare_random_shopping_mall_customer_bulk_unban";

export async function generate_random_shopping_mall_admin_customers_bulk_unban_bulk_unban(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallCustomerBulkUnban.ICreate> | undefined;
  },
): Promise<IShoppingMallCustomerBulkUnban.IResult> {
  const prepared: IShoppingMallCustomerBulkUnban.ICreate =
    prepare_random_shopping_mall_customer_bulk_unban(props.body);
  return await api.functional.shoppingMall.admin.customers.bulk_unban.bulkUnban(
    connection,
    {
      body: prepared,
    },
  );
}

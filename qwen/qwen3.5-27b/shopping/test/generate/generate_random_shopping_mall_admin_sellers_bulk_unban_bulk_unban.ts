import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSellerBulkUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerBulkUnban";
import type { IShoppingMallSellerBulkUnbanDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerBulkUnbanDetail";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_seller_bulk_unban } from "../prepare/prepare_random_shopping_mall_seller_bulk_unban";

export async function generate_random_shopping_mall_admin_sellers_bulk_unban_bulk_unban(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSellerBulkUnban.ICreate> | undefined;
  },
): Promise<IShoppingMallSellerBulkUnban.IResult> {
  const prepared: IShoppingMallSellerBulkUnban.ICreate =
    prepare_random_shopping_mall_seller_bulk_unban(props.body);
  return await api.functional.shoppingMall.admin.sellers.bulk_unban.bulkUnban(
    connection,
    {
      body: prepared,
    },
  );
}

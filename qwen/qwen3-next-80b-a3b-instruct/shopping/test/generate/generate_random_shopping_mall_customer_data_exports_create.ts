import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallDataExport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDataExport";
import type { IShoppingMallDataExportFilters } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDataExportFilters";
import { prepare_random_shopping_mall_data_export } from "../prepare/prepare_random_shopping_mall_data_export";
export async function generate_random_shopping_mall_customer_data_exports_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallDataExport.ICreate> | undefined;
  },
): Promise<IShoppingMallDataExport> {
  const prepared: IShoppingMallDataExport.ICreate =
    prepare_random_shopping_mall_data_export(props.body);
  return await api.functional.shoppingMall.customer.data.exports.create(
    connection,
    {
      body: prepared,
    },
  );
}

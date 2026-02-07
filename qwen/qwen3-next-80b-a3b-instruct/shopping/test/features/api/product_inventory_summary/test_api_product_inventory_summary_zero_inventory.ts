import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductInventorySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductInventorySummary";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductInventorySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventorySummary";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_inventory_summary_zero_inventory(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for API access
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate a random product ID (in real test environment, this would be an existing product with zero inventory)
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Call the inventory summary endpoint with the product ID and empty request body
  const result = await api.functional.shoppingMall.products.inventory.index(
    adminConnection,
    {
      productId,
      body: {} satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(result);
  // Validate the inventory summary response as per scenario requirements
  // Scenarios requires data array to be empty, and pagination to have current=1, limit=10, records=0, pages=0
  TestValidator.equals("data array is empty", result.data.length, 0);
  TestValidator.equals("pagination current is 1", result.pagination.current, 1);
  TestValidator.equals("pagination limit is 10", result.pagination.limit, 10);
  TestValidator.equals("pagination records is 0", result.pagination.records, 0);
  TestValidator.equals("pagination pages is 0", result.pagination.pages, 0);
}

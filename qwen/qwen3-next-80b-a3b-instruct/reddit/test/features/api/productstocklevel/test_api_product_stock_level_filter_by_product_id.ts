import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformProductStockLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductStockLevel";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformProductStockLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformProductStockLevel";
export async function test_api_product_stock_level_filter_by_product_id(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that is extremely unlikely to exist in the system
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Query product stock levels filtered by product_id
  const result: IPageICommunityPlatformProductStockLevel =
    await api.functional.communityPlatform.productstocklevels.index(
      connection,
      {
        body: {
          product_id: productId,
        } satisfies ICommunityPlatformProductStockLevel.IRequest,
      },
    );
  typia.assert(result);
  // Validate response structure is correct (regardless of actual count)
  TestValidator.equals(
    "results are an array",
    Array.isArray(result.data),
    true,
  );
  TestValidator.equals(
    "pagination object exists",
    typeof result.pagination === "object",
    true,
  );
  TestValidator.equals(
    "pagination has correct structure",
    result.pagination !== null,
    true,
  );
  TestValidator.equals(
    "pagination fields are numbers",
    typeof result.pagination.current === "number" &&
      typeof result.pagination.limit === "number" &&
      typeof result.pagination.records === "number" &&
      typeof result.pagination.pages === "number",
    true,
  );
  // Validate that each item in data array has correct structure
  if (result.data.length > 0) {
    const firstItem = result.data[0];
    TestValidator.equals(
      "first item has product_id",
      typeof firstItem.product_id === "string",
      true,
    );
    TestValidator.equals(
      "product_id is UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        firstItem.product_id,
      ),
      true,
    );
    TestValidator.equals(
      "first item has warehouse_id",
      typeof firstItem.warehouse_id === "string",
      true,
    );
    TestValidator.equals(
      "warehouse_id is UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        firstItem.warehouse_id,
      ),
      true,
    );
    TestValidator.equals(
      "first item has quantity",
      typeof firstItem.quantity === "number",
      true,
    );
    TestValidator.equals(
      "quantity is non-negative",
      firstItem.quantity >= 0,
      true,
    );
  }
}

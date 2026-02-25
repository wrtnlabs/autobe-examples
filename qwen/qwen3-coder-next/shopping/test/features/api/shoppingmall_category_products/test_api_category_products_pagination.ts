import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_products_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test the category products pagination endpoint
  // Since no API exists to create categories/products, we test with a placeholder UUID
  // and verify the pagination structure is correct when valid data is returned
  const sellerConnection: api.IConnection = { host: connection.host };
  // Test with a placeholder UUID - if category doesn't exist, expect 404
  try {
    const result = await api.functional.shoppingMall.categories.products.index(
      sellerConnection,
      {
        categoryId: "00000000-0000-0000-0000-000000000000",
      },
    );
    typia.assert(result);
    // Verify pagination structure exists
    TestValidator.predicate(
      "has pagination object",
      result.pagination !== undefined,
    );
    TestValidator.predicate("has data array", result.data !== undefined);
    TestValidator.predicate(
      "pagination has current",
      result.pagination.current !== undefined,
    );
    TestValidator.predicate(
      "pagination has limit",
      result.pagination.limit !== undefined,
    );
    TestValidator.predicate(
      "pagination has records",
      result.pagination.records !== undefined,
    );
    TestValidator.predicate(
      "pagination has pages",
      result.pagination.pages !== undefined,
    );
    // Verify pagination values are valid
    TestValidator.predicate(
      "current page >= 1",
      result.pagination.current >= 1,
    );
    TestValidator.predicate("limit > 0", result.pagination.limit > 0);
    TestValidator.predicate("records >= 0", result.pagination.records >= 0);
    TestValidator.predicate("pages >= 0", result.pagination.pages >= 0);
    // Verify data length matches pagination if records exist
    if (result.pagination.records > 0) {
      TestValidator.predicate(
        "data length <= limit",
        result.data.length <= result.pagination.limit,
      );
    }
  } catch (error) {
    // If the placeholder UUID doesn't work, verify the API responds appropriately
    if (error instanceof api.HttpError) {
      TestValidator.equals(
        "endpoint handles non-existent category",
        error.status,
        404,
      );
    } else {
      throw error;
    }
  }
}

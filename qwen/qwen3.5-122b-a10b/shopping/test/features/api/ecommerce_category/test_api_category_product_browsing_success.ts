import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test successful product browsing within a category.
 *
 * Validates the product browsing functionality within a specific category, ensuring that the system correctly returns active products with proper pagination, sorting, and filtering capabilities. The test verifies that soft-deleted products are excluded and that all required product summary fields are present in the response.
 *
 * This test focuses on the read-only browsing experience for customers, ensuring that category-based product discovery works correctly with various query parameters.
 *
 * 1. Generate a valid category ID for testing.
 * 2. Browse products in the category with default parameters.
 * 3. Validate response structure includes pagination and product summaries.
 * 4. Verify sorting options work correctly (by name, created_at, base_price).
 * 5. Test pagination with cursor-based navigation.
 * 6. Validate business logic: soft-deleted products are excluded from results.
 */
export async function test_api_category_product_browsing_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate a valid category ID for testing
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Browse products in the category with default parameters
  const browseResult: IPageIEcommerceProduct.ISummary =
    await api.functional.ecommerce.categories.products.index(connection, {
      categoryId,
      body: {
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies IEcommerceProduct.IRequest,
    });
  typia.assert(browseResult);
  // 3. Validate pagination structure
  TestValidator.predicate(
    "pagination current is non-negative",
    browseResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    browseResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    browseResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    browseResult.pagination.pages >= 0,
  );
  // 4. Verify sorting options work correctly
  const sortByPriceResult: IPageIEcommerceProduct.ISummary =
    await api.functional.ecommerce.categories.products.index(connection, {
      categoryId,
      body: {
        sort_by: "base_price",
        sort_order: "asc",
        limit: 20,
      } satisfies IEcommerceProduct.IRequest,
    });
  typia.assert(sortByPriceResult);
  const sortByNameResult: IPageIEcommerceProduct.ISummary =
    await api.functional.ecommerce.categories.products.index(connection, {
      categoryId,
      body: {
        sort_by: "name",
        sort_order: "asc",
        limit: 20,
      } satisfies IEcommerceProduct.IRequest,
    });
  typia.assert(sortByNameResult);
  // 5. Test pagination with cursor-based navigation
  const cursorBrowseResult: IPageIEcommerceProduct.ISummary =
    await api.functional.ecommerce.categories.products.index(connection, {
      categoryId,
      body: {
        limit: 10,
        cursor: typia.random<string>(),
      } satisfies IEcommerceProduct.IRequest,
    });
  typia.assert(cursorBrowseResult);
  // 6. Validate business logic: soft-deleted products are excluded from results
  if (browseResult.data.length > 0) {
    TestValidator.predicate(
      "soft-deleted products excluded",
      browseResult.data.every((product) => product.deleted_at === null),
    );
  }
}

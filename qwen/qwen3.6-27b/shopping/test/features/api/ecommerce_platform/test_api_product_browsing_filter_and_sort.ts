import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Tests combined filtering and sorting logic on PATCH /ecommercePlatform/products.
 *
 * Validates product browsing with multiple optional filters including partial text search on product name, inclusive price range filtering, exact category and seller profile filtering. Verifies that results are correctly sorted by basePrice in ascending order and that pagination controls with offset and limit function correctly.
 *
 * Tests the following filter combinations for product browsing:
 * - Text search: productName containing partial terms.
 * - Price range: minBasePrice = 10.0 and maxBasePrice = 50.0 inclusive bounds.
 * - Category filter: categoryId matching a specific UUID for both root and subcategory UUIDs.
 * - Seller filter: sellerProfileId matching a specific seller profile UUID.
 *
 * Additionally tests sorting by basePrice in ascending order and pagination with limit=10 for the first page, followed by offset pagination for subsequent pages.
 *
 * 1. Applies combined filters: product name search, price range, category, and seller profile.
 * 2. Calls PATCH /ecommercePlatform/products with sortField='basePrice' and sortOrder='asc'.
 * 3. Validates response structure including pagination and data array.
 * 4. Verifies returned products match all applied filters.
 * 5. Validates sorting order is correctly ascending by basePrice.
 * 6. Tests pagination with limit=10 and offset to retrieve the next page of results.
 */
export async function test_api_product_browsing_filter_and_sort(
  connection: api.IConnection,
) {
  // 1. Generate random UUIDs for category and seller filters
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const sellerProfileId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Construct request with combined filters
  const body = {
    productName: "phone",
    minBasePrice: 10.0,
    maxBasePrice: 50.0,
    categoryId,
    sellerProfileId,
    sortField: "basePrice",
    sortOrder: "asc",
    limit: 10,
    offset: 0,
  } satisfies IEcommercePlatformProduct.IRequest;
  // 3. Call the index API with combined filters
  const response = await api.functional.ecommercePlatform.products.index(
    connection,
    { body },
  );
  typia.assert(response);
  // 4. Validate pagination metadata
  TestValidator.equals("limit is 10", response.pagination.limit, 10);
  TestValidator.predicate(
    "current page is at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "records is at least 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is at least 0",
    response.pagination.pages >= 0,
  );
  // 5. Validate each product matches all filters
  const data = response.data;
  typia.assert(data);
  TestValidator.predicate("data is an array", Array.isArray(data));
  // Validate product filter compliance
  for (const product of data) {
    typia.assert(product);
    // Price range filters (inclusive)
    TestValidator.predicate(
      "product price is within range",
      product.basePrice >= 10.0,
    );
    TestValidator.predicate(
      "product price does not exceed max",
      product.basePrice <= 50.0,
    );
    // Category match
    TestValidator.equals(
      "category ID matches filter",
      product.category.id,
      categoryId,
    );
    // Seller profile match
    TestValidator.equals(
      "seller profile ID matches filter",
      product.sellerProfile.id,
      sellerProfileId,
    );
    // Name contains partial match
    TestValidator.predicate(
      "product name contains search term",
      product.name.toLowerCase().includes("phone"),
    );
  }
  // 6. Test sorting order (if more than one product)
  if (data.length > 1) {
    for (let i = 0; i < data.length - 1; i++) {
      TestValidator.predicate(
        "products are sorted ascending by basePrice",
        data[i].basePrice <= data[i + 1].basePrice,
      );
    }
  }
  // 7. Test pagination with offset for second page
  const secondPageBody = {
    ...body,
    offset: 10,
  } satisfies IEcommercePlatformProduct.IRequest;
  const secondPageResponse =
    await api.functional.ecommercePlatform.products.index(connection, {
      body: secondPageBody,
    });
  typia.assert(secondPageResponse);
  // Validate second page pagination
  TestValidator.equals(
    "second page limit",
    secondPageResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "second page current",
    secondPageResponse.pagination.current >= 1,
  );
  // 8. Test page-based pagination
  const pageBody = {
    productName: "phone",
    minBasePrice: 10.0,
    maxBasePrice: 50.0,
    categoryId,
    sellerProfileId,
    sortField: "basePrice",
    sortOrder: "asc",
    page: 1,
  } satisfies IEcommercePlatformProduct.IRequest;
  const pageResponse = await api.functional.ecommercePlatform.products.index(
    connection,
    { body: pageBody },
  );
  typia.assert(pageResponse);
  TestValidator.equals(
    "page response current",
    pageResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "page response limit",
    pageResponse.pagination.limit,
    20,
  );
}

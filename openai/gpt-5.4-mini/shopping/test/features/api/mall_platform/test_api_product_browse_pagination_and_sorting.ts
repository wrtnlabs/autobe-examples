import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test product catalog pagination and newest-first browsing behavior.
 *
 * Validates that the public product browse endpoint returns a paginated page of product summaries, preserves the expected summary shape, and orders results by newest first. The test focuses on customer-visible catalog data such as seller identity, category context, thumbnail image, pricing summary, availability counters, review aggregates, and lifecycle timestamps.
 *
 * Special attention is given to the page metadata contract and the ordering guarantees for browse results. Each returned item is checked as a compact summary only, and the response is verified to remain consistent with the public catalog listing structure.
 *
 * 1. Request the first catalog page with a small limit and newest-first sorting.
 * 2. Validate pagination metadata and ensure the response contains only product summaries.
 * 3. Confirm each summary exposes the expected customer-facing fields and nested seller/category/image summaries.
 * 4. Verify the returned page is ordered from newest to oldest by created timestamp.
 */
export async function test_api_product_browse_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  const response = await api.functional.mallPlatform.products.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
        sort: "newest",
      } satisfies IMallPlatformProduct.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.equals("current page", response.pagination.current, 1);
  TestValidator.equals("page size", response.pagination.limit, 5);
  TestValidator.predicate(
    "total records are non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages are non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length does not exceed requested limit",
    response.data.length <= response.pagination.limit,
  );
  for (const product of response.data) {
    typia.assert(product);
    typia.assert(product.sellerAccount);
    if (product.category !== null) typia.assert(product.category);
    if (product.mainImage !== null) typia.assert(product.mainImage);
    TestValidator.predicate("product id exists", product.id.length > 0);
    TestValidator.predicate("product name exists", product.name.length > 0);
    TestValidator.predicate(
      "product description exists",
      product.description.length > 0,
    );
    TestValidator.predicate(
      "base price is non-negative",
      product.basePrice >= 0,
    );
    TestValidator.predicate(
      "minimum price is non-negative",
      product.priceMin >= 0,
    );
    TestValidator.predicate(
      "maximum price is non-negative",
      product.priceMax >= 0,
    );
    TestValidator.predicate(
      "price range is ordered",
      product.priceMin <= product.priceMax,
    );
    TestValidator.predicate(
      "available variants are non-negative",
      product.availableVariantCount >= 0,
    );
    TestValidator.predicate(
      "review count is non-negative",
      product.reviewCount >= 0,
    );
    TestValidator.predicate(
      "created timestamp exists",
      product.createdAt.length > 0,
    );
    TestValidator.predicate(
      "updated timestamp exists",
      product.updatedAt.length > 0,
    );
    TestValidator.equals(
      "active browse results are not soft-deleted",
      product.deletedAt,
      null,
    );
  }
  for (let i = 1; i < response.data.length; i++) {
    TestValidator.predicate(
      "results are sorted by newest first",
      response.data[i - 1].createdAt >= response.data[i].createdAt,
    );
  }
}

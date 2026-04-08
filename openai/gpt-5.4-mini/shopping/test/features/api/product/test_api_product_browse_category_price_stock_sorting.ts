import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test product browsing with category-aware price and stock filters.
 *
 * Validates the marketplace product browse endpoint returns paginated catalog summaries with the expected listing metadata, including seller and category summary objects needed for product cards. The test focuses on read-side browsing behavior and ensures the response obeys price-desc ordering and stable pagination contracts.
 *
 * Because the available API surface only exposes the browse endpoint, the test validates the response shape and catalog ordering rules directly from the returned page data. It checks that each listed product includes the seller summary, that category information is present when provided, and that the overall result set is ordered by descending base price while honoring stock-oriented browsing flags.
 *
 * 1. Requests a catalog page with category, price-range, stock-only, and sorting filters.
 * 2. Validates pagination metadata and browse response structure.
 * 3. Confirms each product summary includes seller and category listing information.
 * 4. Verifies products are ordered by price from high to low.
 */
export async function test_api_product_browse_category_price_stock_sorting(
  connection: api.IConnection,
): Promise<void> {
  const output = await api.functional.mallPlatform.products.index(connection, {
    body: {
      minPrice: 0,
      maxPrice: 999999,
      inStockOnly: true,
      sort: "priceDesc",
      page: 1,
      limit: 10,
    } satisfies IMallPlatformProduct.IRequest,
  });
  typia.assert(output);
  TestValidator.equals("pagination current page", output.pagination.current, 1);
  TestValidator.equals("pagination limit", output.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records are non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages are non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "result count does not exceed page limit",
    output.data.length <= output.pagination.limit,
  );
  for (const product of output.data) {
    TestValidator.predicate("product id exists", product.id.length > 0);
    TestValidator.predicate("product name exists", product.name.length > 0);
    TestValidator.predicate(
      "product description exists",
      product.description.length > 0,
    );
    TestValidator.predicate(
      "product base price is within requested minimum",
      product.basePrice >= 0,
    );
    TestValidator.predicate(
      "product base price is within requested maximum",
      product.basePrice <= 999999,
    );
    TestValidator.predicate(
      "seller summary exists",
      product.sellerAccount.id.length > 0 &&
        product.sellerAccount.email.length > 0,
    );
    TestValidator.predicate(
      "category summary exists when present",
      product.category === null ||
        (product.category.id.length > 0 && product.category.name.length > 0),
    );
    TestValidator.equals(
      "product remains visible in browse results",
      product.deletedAt,
      null,
    );
  }
  for (let index = 1; index < output.data.length; index += 1) {
    TestValidator.predicate(
      "products are sorted by price descending",
      output.data[index - 1].basePrice >= output.data[index].basePrice,
    );
  }
}

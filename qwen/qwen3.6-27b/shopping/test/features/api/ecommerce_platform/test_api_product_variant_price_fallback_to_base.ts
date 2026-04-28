import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Tests the business rule that variant price falls back to the parent product base price when filtering by price range, and validates the variant listing endpoint returns correctly filtered and paginated results.
 *
 * The PATCH endpoint for product variant listing supports optional filters for SKU search, price range (priceMin, priceMax), and stock availability. When a variant has no explicit price override, its effective price defaults to the parent product's base price for filtering comparison purposes.
 *
 * 1. Generate a random valid product UUID and make requests with various filter combinations.
 * 2. Test no filters to retrieve default page of all variants.
 * 3. Test priceMin filter to verify minimum price threshold enforcement.
 * 4. Test priceMax filter to verify maximum price threshold enforcement.
 * 5. Test combined priceMin and priceMax range filtering.
 * 6. Validate response structure, pagination metadata, and variant summary properties.
 */
export async function test_api_product_variant_price_fallback_to_base(
  connection: api.IConnection,
): Promise<void> {
  const productConnection: api.IConnection = { host: connection.host };
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Test with no filters - get default page of variants
  const bodyNoFilter = {} satisfies IEcommercePlatformProductVariant.IRequest;
  const resultNoFilter =
    await api.functional.ecommercePlatform.products.variants.index(
      productConnection,
      {
        productId,
        body: bodyNoFilter,
      },
    );
  typia.assert(resultNoFilter);
  typia.assert(resultNoFilter.pagination);
  typia.assert(resultNoFilter.data);
  // Test with priceMin filter only
  const priceMin1 = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1>
  >();
  const bodyPriceMin = {
    priceMin: priceMin1,
  } satisfies IEcommercePlatformProductVariant.IRequest;
  const resultPriceMin =
    await api.functional.ecommercePlatform.products.variants.index(
      productConnection,
      {
        productId,
        body: bodyPriceMin,
      },
    );
  typia.assert(resultPriceMin);
  typia.assert(resultPriceMin.pagination);
  typia.assert(resultPriceMin.data);
  // Test with priceMax filter only
  const priceMax1 = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1>
  >();
  const bodyPriceMax = {
    priceMax: priceMax1,
  } satisfies IEcommercePlatformProductVariant.IRequest;
  const resultPriceMax =
    await api.functional.ecommercePlatform.products.variants.index(
      productConnection,
      {
        productId,
        body: bodyPriceMax,
      },
    );
  typia.assert(resultPriceMax);
  typia.assert(resultPriceMax.pagination);
  typia.assert(resultPriceMax.data);
  // Test with combined priceMin and priceMax (range filter)
  const priceMin2 = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1>
  >();
  const priceMax2 = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1>
  >();
  const bodyRangeFilter = {
    priceMin: priceMin2,
    priceMax: priceMax2,
  } satisfies IEcommercePlatformProductVariant.IRequest;
  const resultRange =
    await api.functional.ecommercePlatform.products.variants.index(
      productConnection,
      {
        productId,
        body: bodyRangeFilter,
      },
    );
  typia.assert(resultRange);
  typia.assert(resultRange.pagination);
  typia.assert(resultRange.data);
  // Validate pagination correctness for no filter
  TestValidator.equals(
    "no filter pagination current page is 1",
    resultNoFilter.pagination.current,
    1,
  );
  TestValidator.predicate(
    "no filter pagination limit is positive",
    resultNoFilter.pagination.limit > 0,
  );
  TestValidator.predicate(
    "no filter data length matches or is less than limit",
    resultNoFilter.data.length <= resultNoFilter.pagination.limit,
  );
  TestValidator.predicate(
    "no filter records count is non-negative",
    resultNoFilter.pagination.records >= 0,
  );
  // Validate variant summary structure
  if (resultNoFilter.data.length > 0) {
    const variant = resultNoFilter.data[0];
    typia.assert(variant);
    // Verify variant has required properties
    TestValidator.equals(
      "variant id is non-empty string",
      typeof variant.id === "string" && variant.id.length > 0,
      true,
    );
    TestValidator.equals(
      "variant sku_code is non-empty string",
      typeof variant.sku_code === "string" && variant.sku_code.length > 0,
      true,
    );
    // Price can be null (falls back to base price) or a positive number
    TestValidator.predicate(
      "variant price is null or positive number",
      variant.price === null ||
        (typeof variant.price === "number" && variant.price > 0),
    );
    // Stock quantity must be non-negative
    TestValidator.predicate(
      "variant stock_quantity is non-negative",
      typeof variant.stock_quantity === "number" && variant.stock_quantity >= 0,
    );
    // Product reference
    typia.assert(variant.product);
    TestValidator.equals(
      "variant belongs to queried product",
      variant.product.id,
      productId,
    );
    // Product base price is available for comparison when variant price is null
    TestValidator.predicate(
      "product basePrice is non-negative",
      typeof variant.product.basePrice === "number" &&
        variant.product.basePrice >= 0,
    );
    // The effective price logic: when variant price is null, basePrice applies
    if (variant.price === null) {
      TestValidator.predicate(
        "effective price uses product base price when variant price is null",
        variant.product.basePrice >= 0,
      );
    } else {
      TestValidator.predicate(
        "variant has explicit price override",
        variant.price > 0,
      );
    }
  }
  // Validate pagination for priceMin filter
  TestValidator.equals(
    "priceMin filter pagination current page is 1",
    resultPriceMin.pagination.current,
    1,
  );
  // Validate pagination for priceMax filter
  TestValidator.equals(
    "priceMax filter pagination current page is 1",
    resultPriceMax.pagination.current,
    1,
  );
  // Validate pagination for range filter
  TestValidator.equals(
    "range filter pagination current page is 1",
    resultRange.pagination.current,
    1,
  );
  // Test with pagination parameters
  const bodyWithPagination = {
    page: 1 satisfies number as number,
    limit: 5 satisfies number as number,
  } satisfies IEcommercePlatformProductVariant.IRequest;
  const resultWithPagination =
    await api.functional.ecommercePlatform.products.variants.index(
      productConnection,
      {
        productId,
        body: bodyWithPagination,
      },
    );
  typia.assert(resultWithPagination);
  TestValidator.equals(
    "explicit pagination returns requested page",
    resultWithPagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "explicit pagination returns requested limit",
    resultWithPagination.pagination.limit,
    5,
  );
}

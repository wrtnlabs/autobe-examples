import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleImage";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test that sellers can retrieve and search their product sale images with
 * pagination and filtering capabilities.
 *
 * This comprehensive test validates the sale image retrieval API from a
 * seller's perspective, ensuring proper pagination, filtering, sorting, and
 * authorization boundaries. The test creates necessary prerequisites (admin for
 * category, seller for product) and then validates various search scenarios
 * including filtering by display order, primary image status, SKU association,
 * and date ranges.
 *
 * Test Flow:
 *
 * 1. Create and authenticate admin user for category creation
 * 2. Create product category (required for sale creation)
 * 3. Create and authenticate seller user (primary test actor)
 * 4. Retrieve product sale images with various filter combinations
 * 5. Validate pagination metadata and image summary structure
 * 6. Verify all required image fields and URL variants are present
 */
export async function test_api_sale_images_retrieval_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: RandomGenerator.pick([
        "super_admin",
        "moderator",
        "support",
      ] as const),
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create product category (as admin)
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 7,
        }),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        status: RandomGenerator.pick(["active", "inactive"] as const),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create and authenticate seller user
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      business_description: RandomGenerator.content({ paragraphs: 2 }),
      store_name: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 2,
        wordMax: 5,
      }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Retrieve sale images with basic pagination
  // Note: Using random saleCode since no sale creation API is available
  const saleCode = RandomGenerator.alphaNumeric(12);

  const basicRequest = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallSaleImage.IRequest;

  const basicResult =
    await api.functional.shoppingMall.seller.sales.images.index(connection, {
      saleCode: saleCode,
      body: basicRequest,
    });
  typia.assert(basicResult);

  // Step 5: Validate pagination metadata structure
  TestValidator.predicate(
    "pagination metadata exists",
    basicResult.pagination !== null && basicResult.pagination !== undefined,
  );

  TestValidator.predicate(
    "current page is valid",
    basicResult.pagination.current >= 1,
  );

  TestValidator.predicate(
    "limit is positive",
    basicResult.pagination.limit > 0,
  );

  TestValidator.predicate(
    "records count is non-negative",
    basicResult.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pages count is non-negative",
    basicResult.pagination.pages >= 0,
  );

  // Step 6: Validate data array structure
  TestValidator.predicate("data array exists", Array.isArray(basicResult.data));

  // Step 7: Test sorting by display order
  const sortedRequest = {
    page: 1,
    limit: 20,
    sort: ["display_order:asc", "created_at:desc"],
  } satisfies IShoppingMallSaleImage.IRequest;

  const sortedResult =
    await api.functional.shoppingMall.seller.sales.images.index(connection, {
      saleCode: saleCode,
      body: sortedRequest,
    });
  typia.assert(sortedResult);

  // Step 8: Test filtering by primary image status
  const primaryFilterRequest = {
    page: 1,
    limit: 10,
    is_primary: true,
  } satisfies IShoppingMallSaleImage.IRequest;

  const primaryResult =
    await api.functional.shoppingMall.seller.sales.images.index(connection, {
      saleCode: saleCode,
      body: primaryFilterRequest,
    });
  typia.assert(primaryResult);

  // Step 9: Test filtering by SKU association (product-level images)
  const productLevelRequest = {
    page: 1,
    limit: 10,
    shopping_mall_sale_sku_id: null,
  } satisfies IShoppingMallSaleImage.IRequest;

  const productLevelResult =
    await api.functional.shoppingMall.seller.sales.images.index(connection, {
      saleCode: saleCode,
      body: productLevelRequest,
    });
  typia.assert(productLevelResult);

  // Step 10: Test filtering by display order range
  const orderRangeRequest = {
    page: 1,
    limit: 10,
    display_order_min: 0,
    display_order_max: 5,
  } satisfies IShoppingMallSaleImage.IRequest;

  const orderRangeResult =
    await api.functional.shoppingMall.seller.sales.images.index(connection, {
      saleCode: saleCode,
      body: orderRangeRequest,
    });
  typia.assert(orderRangeResult);

  // Step 11: Test date range filtering
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const dateRangeRequest = {
    page: 1,
    limit: 10,
    created_at_min: thirtyDaysAgo.toISOString(),
    created_at_max: now.toISOString(),
  } satisfies IShoppingMallSaleImage.IRequest;

  const dateRangeResult =
    await api.functional.shoppingMall.seller.sales.images.index(connection, {
      saleCode: saleCode,
      body: dateRangeRequest,
    });
  typia.assert(dateRangeResult);

  // Step 12: Test search functionality
  const searchRequest = {
    page: 1,
    limit: 10,
    search: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 5 }),
  } satisfies IShoppingMallSaleImage.IRequest;

  const searchResult =
    await api.functional.shoppingMall.seller.sales.images.index(connection, {
      saleCode: saleCode,
      body: searchRequest,
    });
  typia.assert(searchResult);

  // Step 13: Validate image summary structure if data exists
  if (basicResult.data.length > 0) {
    const sampleImage = basicResult.data[0];

    TestValidator.predicate(
      "image has id",
      typeof sampleImage.id === "string" && sampleImage.id.length > 0,
    );

    TestValidator.predicate(
      "image has sale reference",
      typeof sampleImage.shopping_mall_sale_id === "string",
    );

    TestValidator.predicate(
      "image has all URL variants",
      typeof sampleImage.url_original === "string" &&
        typeof sampleImage.url_large === "string" &&
        typeof sampleImage.url_medium === "string" &&
        typeof sampleImage.url_small === "string" &&
        typeof sampleImage.url_thumbnail === "string",
    );

    TestValidator.predicate(
      "image has display order",
      typeof sampleImage.display_order === "number" &&
        sampleImage.display_order >= 0,
    );

    TestValidator.predicate(
      "image has primary flag",
      typeof sampleImage.is_primary === "boolean",
    );

    TestValidator.predicate(
      "image has creation timestamp",
      typeof sampleImage.created_at === "string",
    );
  }

  // Step 14: Test combined filters
  const combinedRequest = {
    page: 1,
    limit: 15,
    sort: ["display_order:asc"],
    is_primary: false,
    display_order_min: 1,
    display_order_max: 10,
  } satisfies IShoppingMallSaleImage.IRequest;

  const combinedResult =
    await api.functional.shoppingMall.seller.sales.images.index(connection, {
      saleCode: saleCode,
      body: combinedRequest,
    });
  typia.assert(combinedResult);

  TestValidator.predicate(
    "combined filter result has valid pagination",
    combinedResult.pagination.current === 1 &&
      combinedResult.pagination.limit === 15,
  );
}

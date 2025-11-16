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
 * Test administrative image moderation and review workflow.
 *
 * This test validates that administrators can efficiently search, filter, and
 * browse product sale images across the entire marketplace for content
 * moderation purposes.
 *
 * Workflow:
 *
 * 1. Create admin account with super_admin privileges
 * 2. Create seller account and product category
 * 3. Search and filter images by various criteria (creation date, display order,
 *    primary status)
 * 4. Validate pagination and filtering functionality
 * 5. Verify admin can efficiently browse large image collections for moderation
 */
export async function test_api_sale_images_admin_moderation_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for content moderation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminCreateData = {
    email: adminEmail,
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile("+1"),
    admin_level: "super_admin" as const,
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminCreateData,
  });
  typia.assert(admin);

  // Step 2: Create seller account to own product sales
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerCreateData = {
    email: sellerEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile("+1"),
    business_name: RandomGenerator.name(2),
    business_description: RandomGenerator.paragraph({ sentences: 5 }),
    store_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerCreateData,
  });
  typia.assert(seller);

  // Step 3: Create category for product organization
  const categoryCreateData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: typia.random<
      number & tags.Type<"int32">
    >() satisfies number as number,
    status: "active" as const,
  } satisfies IShoppingMallCategory.ICreate;

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: categoryCreateData,
    },
  );
  typia.assert(category);

  // Step 4: Search for images requiring moderation - basic search
  const basicSearchRequest = {
    page: 1,
    limit: 20,
  } satisfies IShoppingMallSaleImage.IRequest;

  const basicSearchResult =
    await api.functional.shoppingMall.admin.sales.images.index(connection, {
      saleCode: RandomGenerator.alphaNumeric(10),
      body: basicSearchRequest,
    });
  typia.assert(basicSearchResult);

  TestValidator.equals(
    "pagination page should match request",
    basicSearchResult.pagination.current,
    1,
  );

  // Step 5: Filter by recently uploaded images using created_at_min
  const recentDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentImagesRequest = {
    page: 1,
    limit: 10,
    created_at_min: recentDate.toISOString(),
  } satisfies IShoppingMallSaleImage.IRequest;

  const recentImagesResult =
    await api.functional.shoppingMall.admin.sales.images.index(connection, {
      saleCode: RandomGenerator.alphaNumeric(10),
      body: recentImagesRequest,
    });
  typia.assert(recentImagesResult);

  // Step 6: Filter by display order range
  const displayOrderRequest = {
    page: 1,
    limit: 15,
    display_order_min: 0,
    display_order_max: 10,
  } satisfies IShoppingMallSaleImage.IRequest;

  const displayOrderResult =
    await api.functional.shoppingMall.admin.sales.images.index(connection, {
      saleCode: RandomGenerator.alphaNumeric(10),
      body: displayOrderRequest,
    });
  typia.assert(displayOrderResult);

  // Step 7: Filter by primary image status
  const primaryImagesRequest = {
    page: 1,
    limit: 10,
    is_primary: true,
  } satisfies IShoppingMallSaleImage.IRequest;

  const primaryImagesResult =
    await api.functional.shoppingMall.admin.sales.images.index(connection, {
      saleCode: RandomGenerator.alphaNumeric(10),
      body: primaryImagesRequest,
    });
  typia.assert(primaryImagesResult);

  // Step 8: Test pagination with different page sizes
  const largeLimitRequest = {
    page: 1,
    limit: 50,
  } satisfies IShoppingMallSaleImage.IRequest;

  const largeLimitResult =
    await api.functional.shoppingMall.admin.sales.images.index(connection, {
      saleCode: RandomGenerator.alphaNumeric(10),
      body: largeLimitRequest,
    });
  typia.assert(largeLimitResult);

  TestValidator.equals(
    "pagination limit should match request",
    largeLimitResult.pagination.limit,
    50,
  );

  // Step 9: Test with sorting options
  const sortedRequest = {
    page: 1,
    limit: 20,
    sort: ["created_at:desc", "display_order:asc"],
  } satisfies IShoppingMallSaleImage.IRequest;

  const sortedResult =
    await api.functional.shoppingMall.admin.sales.images.index(connection, {
      saleCode: RandomGenerator.alphaNumeric(10),
      body: sortedRequest,
    });
  typia.assert(sortedResult);

  // Step 10: Test search with text query
  const searchWithTextRequest = {
    page: 1,
    limit: 10,
    search: RandomGenerator.name(2),
  } satisfies IShoppingMallSaleImage.IRequest;

  const searchWithTextResult =
    await api.functional.shoppingMall.admin.sales.images.index(connection, {
      saleCode: RandomGenerator.alphaNumeric(10),
      body: searchWithTextRequest,
    });
  typia.assert(searchWithTextResult);

  // Step 11: Test filtering by date range
  const dateRangeRequest = {
    page: 1,
    limit: 10,
    created_at_min: new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    created_at_max: new Date().toISOString(),
  } satisfies IShoppingMallSaleImage.IRequest;

  const dateRangeResult =
    await api.functional.shoppingMall.admin.sales.images.index(connection, {
      saleCode: RandomGenerator.alphaNumeric(10),
      body: dateRangeRequest,
    });
  typia.assert(dateRangeResult);
}

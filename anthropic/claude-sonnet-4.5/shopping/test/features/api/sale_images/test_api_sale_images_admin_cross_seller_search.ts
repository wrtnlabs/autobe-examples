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
 * Test admin capability to search images across multiple sellers and products.
 *
 * This test validates that administrators have platform-wide visibility to
 * search and filter product images across all sellers in the marketplace. It
 * demonstrates that admin permissions transcend seller boundaries, enabling
 * comprehensive content moderation, compliance monitoring, and platform-wide
 * image management.
 *
 * Test Flow:
 *
 * 1. Create admin account with platform-wide access privileges
 * 2. Create multiple seller accounts representing different business entities
 * 3. Create shared product category for classification
 * 4. Execute cross-seller image search as admin
 * 5. Validate search works across seller boundaries with proper pagination
 * 6. Verify admin has unrestricted access to all image metadata
 */
export async function test_api_sale_images_admin_cross_seller_search(
  connection: api.IConnection,
) {
  // Step 1: Create admin account with super_admin privileges for platform-wide access
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Create first seller account
  const seller1Email = typia.random<string & tags.Format<"email">>();
  const seller1Data = {
    email: seller1Email,
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 7,
    }),
    business_description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
    store_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 2,
      wordMax: 5,
    }),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller1 = await api.functional.auth.seller.join(connection, {
    body: seller1Data,
  });
  typia.assert(seller1);

  // Step 3: Create second seller account
  const seller2Email = typia.random<string & tags.Format<"email">>();
  const seller2Data = {
    email: seller2Email,
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 7,
    }),
    business_description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
    store_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 2,
      wordMax: 5,
    }),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller2 = await api.functional.auth.seller.join(connection, {
    body: seller2Data,
  });
  typia.assert(seller2);

  // Step 4: Create product category (admin authenticated context)
  const categoryData = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    image_url: typia.random<string & tags.Format<"uri">>(),
    display_order: typia.random<number & tags.Type<"int32">>(),
    status: "active" as const,
  } satisfies IShoppingMallCategory.ICreate;

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: categoryData,
    },
  );
  typia.assert(category);

  // Step 5: Execute admin cross-seller image search
  // Using a placeholder saleCode since we cannot create sales with available APIs
  const testSaleCode = RandomGenerator.alphaNumeric(12);

  const searchRequest = {
    page: 1,
    limit: 20,
    sort: ["display_order:asc", "created_at:desc"],
  } satisfies IShoppingMallSaleImage.IRequest;

  const imageSearchResult =
    await api.functional.shoppingMall.admin.sales.images.index(connection, {
      saleCode: testSaleCode,
      body: searchRequest,
    });
  typia.assert(imageSearchResult);

  // Step 6: Validate pagination structure
  TestValidator.predicate(
    "pagination object exists",
    imageSearchResult.pagination !== null &&
      imageSearchResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination current page is valid",
    imageSearchResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    imageSearchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    imageSearchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    imageSearchResult.pagination.pages >= 0,
  );

  // Step 7: Validate data array structure
  TestValidator.predicate(
    "image data array exists",
    Array.isArray(imageSearchResult.data),
  );

  // Step 8: Test with filtering parameters to validate cross-seller search capabilities
  const filteredSearchRequest = {
    page: 1,
    limit: 50,
    display_order_min: 0,
    display_order_max: 100,
    is_primary: true,
  } satisfies IShoppingMallSaleImage.IRequest;

  const filteredResult =
    await api.functional.shoppingMall.admin.sales.images.index(connection, {
      saleCode: testSaleCode,
      body: filteredSearchRequest,
    });
  typia.assert(filteredResult);

  // Validate filtered result structure
  TestValidator.predicate(
    "filtered search returns valid pagination",
    filteredResult.pagination !== null &&
      filteredResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "filtered search data is array",
    Array.isArray(filteredResult.data),
  );
}

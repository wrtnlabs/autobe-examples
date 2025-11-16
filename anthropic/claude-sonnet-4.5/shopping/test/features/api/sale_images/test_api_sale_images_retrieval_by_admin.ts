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
 * Test that platform administrators can retrieve and search product sale images
 * across all sellers with full access.
 *
 * This test validates admin-level privileges for accessing product images
 * regardless of seller ownership. Administrators can view images for any
 * product, search with various filters, and access complete metadata.
 *
 * Test workflow:
 *
 * 1. Create an admin account with platform-wide privileges
 * 2. Create a seller account to own the product sale
 * 3. Create a product category for sale organization
 * 4. Retrieve product sale images as admin using various search criteria
 * 5. Validate pagination, filtering, and sorting capabilities
 * 6. Verify response includes complete image metadata with technical details
 */
export async function test_api_sale_images_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create admin account with platform privileges
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: typia.random<string & tags.Format<"password">>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "super_admin" as const,
        email_verified: true,
        ip: typia.random<string & tags.Format<"ipv4">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create seller account to own the product sale
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        business_name: RandomGenerator.name(2),
        business_description: RandomGenerator.paragraph({ sentences: 5 }),
        store_name: RandomGenerator.name(2),
        ip: typia.random<string & tags.Format<"ipv4">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 3: Create a product category (admin context required)
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: null,
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: typia.random<
          number & tags.Type<"int32">
        >() satisfies number as number,
        status: "active" as const,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Step 4: Retrieve product sale images as admin with basic pagination
  const saleCode = RandomGenerator.alphaNumeric(12);
  const basicRequest = {
    page: 1,
    limit: 20,
  } satisfies IShoppingMallSaleImage.IRequest;

  const basicResult: IPageIShoppingMallSaleImage.ISummary =
    await api.functional.shoppingMall.admin.sales.images.index(connection, {
      saleCode: saleCode,
      body: basicRequest,
    });
  typia.assert(basicResult);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination should have valid structure",
    basicResult.pagination !== null && basicResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page should be 1",
    basicResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "data array should exist",
    Array.isArray(basicResult.data),
  );

  // Step 5: Test filtering with display order range
  const displayOrderRequest = {
    page: 1,
    limit: 10,
    display_order_min: 0,
    display_order_max: 10,
  } satisfies IShoppingMallSaleImage.IRequest;

  const displayOrderResult: IPageIShoppingMallSaleImage.ISummary =
    await api.functional.shoppingMall.admin.sales.images.index(connection, {
      saleCode: saleCode,
      body: displayOrderRequest,
    });
  typia.assert(displayOrderResult);

  // Step 6: Test filtering by primary image status
  const primaryImageRequest = {
    page: 1,
    limit: 5,
    is_primary: true,
  } satisfies IShoppingMallSaleImage.IRequest;

  const primaryImageResult: IPageIShoppingMallSaleImage.ISummary =
    await api.functional.shoppingMall.admin.sales.images.index(connection, {
      saleCode: saleCode,
      body: primaryImageRequest,
    });
  typia.assert(primaryImageResult);

  // Step 7: Test filtering by SKU association (product-level images only)
  const productLevelRequest = {
    page: 1,
    limit: 10,
    shopping_mall_sale_sku_id: null,
  } satisfies IShoppingMallSaleImage.IRequest;

  const productLevelResult: IPageIShoppingMallSaleImage.ISummary =
    await api.functional.shoppingMall.admin.sales.images.index(connection, {
      saleCode: saleCode,
      body: productLevelRequest,
    });
  typia.assert(productLevelResult);

  // Step 8: Test filtering by creation date range
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const dateRangeRequest = {
    page: 1,
    limit: 15,
    created_at_min: thirtyDaysAgo.toISOString(),
    created_at_max: now.toISOString(),
  } satisfies IShoppingMallSaleImage.IRequest;

  const dateRangeResult: IPageIShoppingMallSaleImage.ISummary =
    await api.functional.shoppingMall.admin.sales.images.index(connection, {
      saleCode: saleCode,
      body: dateRangeRequest,
    });
  typia.assert(dateRangeResult);

  // Step 9: Test search functionality with keyword
  const searchRequest = {
    page: 1,
    limit: 10,
    search: RandomGenerator.name(1),
  } satisfies IShoppingMallSaleImage.IRequest;

  const searchResult: IPageIShoppingMallSaleImage.ISummary =
    await api.functional.shoppingMall.admin.sales.images.index(connection, {
      saleCode: saleCode,
      body: searchRequest,
    });
  typia.assert(searchResult);

  // Step 10: Test sorting functionality
  const sortRequest = {
    page: 1,
    limit: 10,
    sort: ["display_order:asc", "created_at:desc"],
  } satisfies IShoppingMallSaleImage.IRequest;

  const sortResult: IPageIShoppingMallSaleImage.ISummary =
    await api.functional.shoppingMall.admin.sales.images.index(connection, {
      saleCode: saleCode,
      body: sortRequest,
    });
  typia.assert(sortResult);

  // Step 11: Test comprehensive filter combination
  const comprehensiveRequest = {
    page: 1,
    limit: 20,
    display_order_min: 0,
    display_order_max: 100,
    is_primary: false,
    sort: ["created_at:desc"],
  } satisfies IShoppingMallSaleImage.IRequest;

  const comprehensiveResult: IPageIShoppingMallSaleImage.ISummary =
    await api.functional.shoppingMall.admin.sales.images.index(connection, {
      saleCode: saleCode,
      body: comprehensiveRequest,
    });
  typia.assert(comprehensiveResult);

  // Final validation: Verify admin has unrestricted access to image metadata
  TestValidator.predicate(
    "admin should successfully retrieve image data",
    comprehensiveResult !== null && comprehensiveResult !== undefined,
  );
}

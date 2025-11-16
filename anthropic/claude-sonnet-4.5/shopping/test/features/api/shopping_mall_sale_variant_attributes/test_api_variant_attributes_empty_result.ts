import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleVariantAttribute";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test variant attribute retrieval for a product sale with no variant
 * attributes.
 *
 * This test validates the system's behavior when querying variant attributes
 * for a simple product that has no customization options configured. It ensures
 * the API gracefully handles products without variants by returning an empty
 * result set with valid pagination metadata rather than throwing an error.
 *
 * Workflow steps:
 *
 * 1. Admin authenticates and creates a product category
 * 2. Seller authenticates and creates a product sale without variant attributes
 * 3. Retrieve variant attributes for the sale using its code
 * 4. Verify the response returns an empty data array with valid pagination
 *    metadata
 *
 * Business logic validations:
 *
 * - Empty variant attribute lists return successful response (not an error)
 * - Pagination metadata shows zero total records
 * - Pagination metadata shows zero total pages
 * - Response structure is consistent with populated results
 * - System properly handles products with no customization options
 */
export async function test_api_variant_attributes_empty_result(
  connection: api.IConnection,
) {
  // Step 1: Admin authenticates to create category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Admin creates product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Seller authenticates
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(3),
      business_description: RandomGenerator.paragraph({ sentences: 5 }),
      store_name: RandomGenerator.name(2),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Seller creates a simple product sale WITHOUT variant attributes
  const saleCode = RandomGenerator.alphaNumeric(12);

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: saleCode,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 7,
        }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        brand: RandomGenerator.name(1),
        condition: "new",
        short_description: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        meta_keywords: RandomGenerator.paragraph({ sentences: 5 }),
        weight: typia.random<number>(),
        dimension_length: typia.random<number>(),
        dimension_width: typia.random<number>(),
        dimension_height: typia.random<number>(),
        manufacturer: RandomGenerator.name(2),
        return_policy_days: 30,
        warranty_info: RandomGenerator.paragraph({ sentences: 4 }),
        status: "published",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 5: Retrieve variant attributes for the sale (expecting empty result)
  const variantAttributesResponse =
    await api.functional.shoppingMall.sales.variantAttributes.index(
      connection,
      {
        saleCode: sale.code,
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallSaleVariantAttribute.IRequest,
      },
    );
  typia.assert(variantAttributesResponse);

  // Step 6: Validate empty result with proper pagination metadata
  TestValidator.equals(
    "data array should be empty",
    variantAttributesResponse.data.length,
    0,
  );

  TestValidator.equals(
    "pagination records should be zero",
    variantAttributesResponse.pagination.records,
    0,
  );

  TestValidator.equals(
    "pagination pages should be zero",
    variantAttributesResponse.pagination.pages,
    0,
  );

  TestValidator.equals(
    "pagination current page should be 1",
    variantAttributesResponse.pagination.current,
    1,
  );

  TestValidator.predicate(
    "pagination limit should be positive",
    variantAttributesResponse.pagination.limit > 0,
  );

  TestValidator.predicate(
    "response structure should match expected type",
    Array.isArray(variantAttributesResponse.data),
  );
}

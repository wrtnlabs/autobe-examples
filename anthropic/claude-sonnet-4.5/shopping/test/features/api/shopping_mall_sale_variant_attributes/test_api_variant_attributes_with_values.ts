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
 * Test that variant attribute retrieval includes complete variant value
 * information.
 *
 * This test validates that each variant attribute returns its associated values
 * with proper ordering and metadata. Since no creation APIs are available for
 * variant attributes and values, this test focuses on validating the structure
 * of the retrieval API response to ensure it properly supports attribute-value
 * hierarchies.
 *
 * Workflow steps:
 *
 * 1. Admin authenticates and creates a product category
 * 2. Seller authenticates and creates a product sale
 * 3. Retrieve variant attributes for the sale using the index API
 * 4. Verify pagination structure is valid
 * 5. Validate that if attributes exist, they include complete values arrays
 * 6. Validate values are ordered by display_order within each attribute
 * 7. Verify all metadata fields are present and valid
 *
 * Business logic validations:
 *
 * - Pagination metadata is properly structured
 * - Each variant attribute includes its values array in the response
 * - Variant values are properly associated with their parent attribute
 * - Values maintain their configured display_order sequence
 * - Value metadata (id, value text, display_order, created_at) is complete
 * - Attributes appear in their configured display_order
 * - Nested structure properly represents attribute-value hierarchy
 */
export async function test_api_variant_attributes_with_values(
  connection: api.IConnection,
) {
  // Step 1: Admin authenticates and creates product category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.Format<"password">>(),
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

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(8),
        description: RandomGenerator.paragraph(),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 2: Seller authenticates and creates product sale
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(3),
      business_description: RandomGenerator.paragraph(),
      store_name: RandomGenerator.name(2),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new",
        return_policy_days: 30,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 3: Retrieve variant attributes for the sale
  const variantAttributesResponse =
    await api.functional.shoppingMall.sales.variantAttributes.index(
      connection,
      {
        saleCode: sale.code,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSaleVariantAttribute.IRequest,
      },
    );
  typia.assert(variantAttributesResponse);

  // Step 4: Validate pagination structure
  TestValidator.predicate(
    "pagination metadata should be present and valid",
    variantAttributesResponse.pagination !== null &&
      variantAttributesResponse.pagination !== undefined,
  );

  TestValidator.predicate(
    "data array should be present in response",
    Array.isArray(variantAttributesResponse.data),
  );

  // Step 5-7: Validate attribute-value hierarchy when data exists
  if (variantAttributesResponse.data.length > 0) {
    for (const attribute of variantAttributesResponse.data) {
      TestValidator.predicate(
        "variant attribute should contain all required fields",
        attribute.id !== null &&
          attribute.sale_id !== null &&
          attribute.name !== null &&
          attribute.display_order !== null &&
          attribute.created_at !== null,
      );

      TestValidator.predicate(
        "variant attribute should include values array",
        Array.isArray(attribute.values),
      );

      // Validate values ordering if multiple values exist
      if (attribute.values.length > 1) {
        for (let i = 0; i < attribute.values.length - 1; i++) {
          TestValidator.predicate(
            `variant values should be ordered by display_order for attribute ${attribute.name}`,
            attribute.values[i].display_order <=
              attribute.values[i + 1].display_order,
          );
        }
      }

      // Validate each value has complete metadata
      for (const value of attribute.values) {
        TestValidator.predicate(
          "variant value should have complete metadata fields",
          value.id !== null &&
            value.shopping_mall_sale_variant_attribute_id !== null &&
            value.value !== null &&
            value.display_order !== null &&
            value.created_at !== null,
        );
      }
    }

    // Validate attributes are ordered by display_order
    if (variantAttributesResponse.data.length > 1) {
      for (let i = 0; i < variantAttributesResponse.data.length - 1; i++) {
        TestValidator.predicate(
          "variant attributes should be ordered by display_order",
          variantAttributesResponse.data[i].display_order <=
            variantAttributesResponse.data[i + 1].display_order,
        );
      }
    }
  }
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test retrieving a variant attribute and validating the complete response
 * structure.
 *
 * This test validates the end-to-end workflow for retrieving a sale variant
 * attribute with all its relationships and nested data properly populated. The
 * test verifies that the response contains all required fields including sale
 * summary, variant values array, and proper metadata structures.
 *
 * Workflow steps:
 *
 * 1. Authenticate as admin and create product category
 * 2. Authenticate as seller and create product sale
 * 3. Create variant attribute with specific name and display_order
 * 4. Retrieve the variant attribute by saleCode and variantAttributeId
 * 5. Validate complete response structure including all nested relationships
 *
 * Validation points:
 *
 * - Response contains all required fields per IShoppingMallSaleVariantAttribute
 *   schema
 * - ID matches the created variant attribute UUID
 * - Shopping_mall_sale_id links to the correct sale
 * - Name matches the created attribute name
 * - Display_order matches the specified value
 * - Created_at timestamp is present and valid ISO 8601 format
 * - Sale property contains IShoppingMallSale.ISummary with complete sale details
 * - Values property contains array of IShoppingMallSaleVariantValue.ISummary
 * - All nested relationships are properly populated
 */
export async function test_api_variant_attribute_retrieval_complete_structure(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to create category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });

  // Step 2: Create category as admin
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph(),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Authenticate as seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(3),
      business_description: RandomGenerator.paragraph(),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });

  // Step 4: Create product sale
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.name(5),
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new",
        return_policy_days: 30,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 5: Create variant attribute
  const variantAttributeName = RandomGenerator.pick([
    "Color",
    "Size",
    "Material",
    "Style",
  ] as const);
  const displayOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();

  const createdAttribute =
    await api.functional.shoppingMall.seller.sales.variantAttributes.create(
      connection,
      {
        saleCode: sale.code,
        body: {
          name: variantAttributeName,
          display_order: displayOrder,
        } satisfies IShoppingMallSaleVariantAttribute.ICreate,
      },
    );
  typia.assert(createdAttribute);

  // Step 6: Retrieve the variant attribute
  const retrievedAttribute =
    await api.functional.shoppingMall.sales.variantAttributes.at(connection, {
      saleCode: sale.code,
      variantAttributeId: createdAttribute.id,
    });
  typia.assert(retrievedAttribute);

  // Step 7: Validate complete response structure

  // Validate ID matches
  TestValidator.equals(
    "variant attribute ID matches",
    retrievedAttribute.id,
    createdAttribute.id,
  );

  // Validate shopping_mall_sale_id links to correct sale
  TestValidator.equals(
    "sale ID matches",
    retrievedAttribute.shopping_mall_sale_id,
    sale.id,
  );

  // Validate name matches
  TestValidator.equals(
    "attribute name matches",
    retrievedAttribute.name,
    variantAttributeName,
  );

  // Validate display_order matches
  TestValidator.equals(
    "display order matches",
    retrievedAttribute.display_order,
    displayOrder,
  );

  // Validate sale summary is populated with correct data
  const saleSummary = retrievedAttribute.sale;
  TestValidator.equals("sale summary ID matches", saleSummary.id, sale.id);
  TestValidator.equals(
    "sale summary code matches",
    saleSummary.code,
    sale.code,
  );
  TestValidator.equals(
    "sale summary title matches",
    saleSummary.title,
    sale.title,
  );
}

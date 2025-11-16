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
 * Test creating multiple variant attribute values with different display orders
 * to validate proper sequencing in buyer selection interfaces.
 *
 * This test creates several variant values (e.g., 'Small', 'Medium', 'Large',
 * 'XL') for a Size attribute with explicit display_order values to ensure they
 * appear in the intended sequence. The test validates that lower display_order
 * numbers appear first, allowing sellers to create logical ordering such as
 * sizes from smallest to largest or colors in a specific brand sequence.
 *
 * Workflow:
 *
 * 1. Authenticate as seller to manage variant value ordering
 * 2. Create admin account and authenticate for category management
 * 3. Create category for product taxonomy
 * 4. Create product sale for variant configuration
 * 5. Create variant attribute (Size) to demonstrate ordered value creation
 * 6. Create multiple variant values with different display_order values (Small=0,
 *    Medium=1, Large=2, XL=3)
 * 7. Validate each value maintains its assigned display order
 * 8. Verify values can be retrieved in the correct sequence for presentation to
 *    buyers
 */
export async function test_api_variant_value_creation_multiple_values_ordering(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph({ sentences: 5 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Create admin account and authenticate
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
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 3: Create category for product taxonomy
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        display_order: 0,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 4: Switch back to seller and create product sale
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.name(3),
        description: RandomGenerator.content({ paragraphs: 3 }),
        condition: "new",
        return_policy_days: 30,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 5: Create variant attribute (Size)
  const variantAttribute =
    await api.functional.shoppingMall.seller.sales.variantAttributes.create(
      connection,
      {
        saleCode: sale.code,
        body: {
          name: "Size",
          display_order: 0,
        } satisfies IShoppingMallSaleVariantAttribute.ICreate,
      },
    );
  typia.assert(variantAttribute);

  // Step 6: Create multiple variant values with different display_order values
  const sizeValues = [
    { value: "Small", display_order: 0 },
    { value: "Medium", display_order: 1 },
    { value: "Large", display_order: 2 },
    { value: "XL", display_order: 3 },
  ];

  const createdValues: IShoppingMallSaleVariantValue[] = [];

  for (const sizeData of sizeValues) {
    const variantValue =
      await api.functional.shoppingMall.seller.sales.variantAttributes.values.create(
        connection,
        {
          saleCode: sale.code,
          variantAttributeId: variantAttribute.id,
          body: {
            value: sizeData.value,
            display_order: sizeData.display_order,
          } satisfies IShoppingMallSaleVariantValue.ICreate,
        },
      );
    typia.assert(variantValue);
    createdValues.push(variantValue);
  }

  // Step 7: Validate each value maintains its assigned display order
  TestValidator.equals(
    "all variant values created successfully",
    createdValues.length,
    sizeValues.length,
  );

  for (let i = 0; i < createdValues.length; i++) {
    TestValidator.equals(
      `variant value '${sizeValues[i].value}' has correct display_order`,
      createdValues[i].display_order,
      sizeValues[i].display_order,
    );

    TestValidator.equals(
      `variant value '${sizeValues[i].value}' has correct value`,
      createdValues[i].value,
      sizeValues[i].value,
    );
  }

  // Step 8: Verify values are in correct sequence (ascending display_order)
  const sortedByDisplayOrder = [...createdValues].sort(
    (a, b) => a.display_order - b.display_order,
  );

  for (let i = 0; i < sortedByDisplayOrder.length; i++) {
    TestValidator.equals(
      `value at position ${i} matches expected order`,
      sortedByDisplayOrder[i].value,
      sizeValues[i].value,
    );

    TestValidator.predicate(
      `display_order is sequential at position ${i}`,
      sortedByDisplayOrder[i].display_order === i,
    );
  }
}

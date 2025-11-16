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
 * Test updating variant value color_code to improve visual representation.
 *
 * This test validates that sellers can modify the hexadecimal color code
 * associated with a variant value to improve visual accuracy in product
 * configuration interfaces. It verifies:
 *
 * 1. Creating a Color variant attribute with an initial color_code
 * 2. Updating the color_code to a different hexadecimal value
 * 3. Verifying the update succeeds and new color_code is returned
 * 4. Setting color_code to null to remove color swatch display
 * 5. Verifying color_code can be successfully removed
 *
 * This ensures sellers can maintain accurate visual representations of their
 * product color options as they refine product presentation.
 */
export async function test_api_variant_value_update_color_code_modification(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create seller account and authenticate
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
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

  // Step 4: Create product sale
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 7,
        }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
        condition: "new",
        return_policy_days: 30,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 5: Create Color variant attribute
  const colorAttribute =
    await api.functional.shoppingMall.seller.sales.variantAttributes.create(
      connection,
      {
        saleCode: sale.code,
        body: {
          name: "Color",
          display_order: 0,
        } satisfies IShoppingMallSaleVariantAttribute.ICreate,
      },
    );
  typia.assert(colorAttribute);

  // Step 6: Create variant value with initial color_code
  const initialColorCode = "#FF0000";
  const variantValue =
    await api.functional.shoppingMall.seller.sales.variantAttributes.values.create(
      connection,
      {
        saleCode: sale.code,
        variantAttributeId: colorAttribute.id,
        body: {
          value: "Red",
          display_order: 0,
          color_code: initialColorCode,
        } satisfies IShoppingMallSaleVariantValue.ICreate,
      },
    );
  typia.assert(variantValue);
  TestValidator.equals(
    "initial color_code should match",
    variantValue.color_code,
    initialColorCode,
  );

  // Step 7: Update color_code to a different hexadecimal value
  const updatedColorCode = "#DC143C";
  const updatedValue =
    await api.functional.shoppingMall.seller.sales.variantAttributes.values.update(
      connection,
      {
        saleCode: sale.code,
        variantAttributeId: colorAttribute.id,
        valueId: variantValue.id,
        body: {
          color_code: updatedColorCode,
        } satisfies IShoppingMallSaleVariantValue.IUpdate,
      },
    );
  typia.assert(updatedValue);

  // Step 8: Verify the updated color_code is returned correctly
  TestValidator.equals(
    "color_code should be updated",
    updatedValue.color_code,
    updatedColorCode,
  );
  TestValidator.equals(
    "value name should remain unchanged",
    updatedValue.value,
    "Red",
  );
  TestValidator.equals(
    "variant attribute ID should remain unchanged",
    updatedValue.shopping_mall_sale_variant_attribute_id,
    colorAttribute.id,
  );

  // Step 9: Update color_code to null to remove color swatch display
  const valueWithNullColor =
    await api.functional.shoppingMall.seller.sales.variantAttributes.values.update(
      connection,
      {
        saleCode: sale.code,
        variantAttributeId: colorAttribute.id,
        valueId: variantValue.id,
        body: {
          color_code: null,
        } satisfies IShoppingMallSaleVariantValue.IUpdate,
      },
    );
  typia.assert(valueWithNullColor);

  // Step 10: Verify color_code is now null
  TestValidator.equals(
    "color_code should be null",
    valueWithNullColor.color_code,
    null,
  );
  TestValidator.equals(
    "value name should still be Red",
    valueWithNullColor.value,
    "Red",
  );
}

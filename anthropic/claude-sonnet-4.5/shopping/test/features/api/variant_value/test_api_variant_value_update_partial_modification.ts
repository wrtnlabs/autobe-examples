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
 * Test partial update of variant value properties to verify that sellers can
 * modify specific fields without affecting others.
 *
 * This test validates that the update operation supports optional fields and
 * only modifies explicitly provided properties. Create a variant value with
 * complete information (value text, display_order, color_code), then perform
 * updates that change only one property at a time. First update only the
 * display_order, verify other fields remain unchanged. Then update only the
 * color_code, verify value text and display_order are preserved. This ensures
 * the update API correctly implements partial update semantics rather than
 * requiring all fields in every update request.
 */
export async function test_api_variant_value_update_partial_modification(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin" as const,
      email_verified: true,
      ip: "127.0.0.1",
      href: "https://admin.example.com/join",
      referrer: "https://admin.example.com",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        status: "active" as const,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "sellerPassword123",
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph({ sentences: 5 }),
      store_name: RandomGenerator.name(2),
      ip: "127.0.0.1",
      href: "https://seller.example.com/join",
      referrer: "https://seller.example.com",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Create product sale
  const saleCode = RandomGenerator.alphaNumeric(12);
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: saleCode,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.name(3),
        description: RandomGenerator.content({ paragraphs: 3 }),
        brand: RandomGenerator.name(1),
        condition: "new" as const,
        return_policy_days: 30,
        warranty_info: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 5: Create variant attribute
  const variantAttribute =
    await api.functional.shoppingMall.seller.sales.variantAttributes.create(
      connection,
      {
        saleCode: saleCode,
        body: {
          name: "Color",
          display_order: 0,
        } satisfies IShoppingMallSaleVariantAttribute.ICreate,
      },
    );
  typia.assert(variantAttribute);

  // Step 6: Create variant value with complete initial state
  const initialValue = "Red";
  const initialDisplayOrder = 1;
  const initialColorCode = "#FF0000";

  const variantValue =
    await api.functional.shoppingMall.seller.sales.variantAttributes.values.create(
      connection,
      {
        saleCode: saleCode,
        variantAttributeId: variantAttribute.id,
        body: {
          value: initialValue,
          display_order: initialDisplayOrder,
          color_code: initialColorCode,
        } satisfies IShoppingMallSaleVariantValue.ICreate,
      },
    );
  typia.assert(variantValue);

  // Verify initial creation
  TestValidator.equals("initial value text", variantValue.value, initialValue);
  TestValidator.equals(
    "initial display_order",
    variantValue.display_order,
    initialDisplayOrder,
  );
  TestValidator.equals(
    "initial color_code",
    variantValue.color_code,
    initialColorCode,
  );

  // Step 7: First partial update - modify only display_order
  const newDisplayOrder = 5;
  const firstUpdate =
    await api.functional.shoppingMall.seller.sales.variantAttributes.values.update(
      connection,
      {
        saleCode: saleCode,
        variantAttributeId: variantAttribute.id,
        valueId: variantValue.id,
        body: {
          display_order: newDisplayOrder,
        } satisfies IShoppingMallSaleVariantValue.IUpdate,
      },
    );
  typia.assert(firstUpdate);

  // Verify first partial update: display_order changed, others unchanged
  TestValidator.equals(
    "value text unchanged after first update",
    firstUpdate.value,
    initialValue,
  );
  TestValidator.equals(
    "display_order updated",
    firstUpdate.display_order,
    newDisplayOrder,
  );
  TestValidator.equals(
    "color_code unchanged after first update",
    firstUpdate.color_code,
    initialColorCode,
  );

  // Step 8: Second partial update - modify only color_code
  const newColorCode = "#00FF00";
  const secondUpdate =
    await api.functional.shoppingMall.seller.sales.variantAttributes.values.update(
      connection,
      {
        saleCode: saleCode,
        variantAttributeId: variantAttribute.id,
        valueId: variantValue.id,
        body: {
          color_code: newColorCode,
        } satisfies IShoppingMallSaleVariantValue.IUpdate,
      },
    );
  typia.assert(secondUpdate);

  // Step 9: Verify second partial update: color_code changed, others preserved from first update
  TestValidator.equals(
    "value text unchanged after second update",
    secondUpdate.value,
    initialValue,
  );
  TestValidator.equals(
    "display_order preserved from first update",
    secondUpdate.display_order,
    newDisplayOrder,
  );
  TestValidator.equals(
    "color_code updated",
    secondUpdate.color_code,
    newColorCode,
  );
}

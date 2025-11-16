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
 * Test updating variant value display_order to reposition options in the
 * variant selector interface.
 *
 * This scenario validates that sellers can reorganize how variant options are
 * presented to buyers by changing the display_order value. Create a product
 * with multiple variant values for a single attribute (e.g., Color: Red, Blue,
 * Green), then update one value's display_order to change its position in the
 * presentation sequence.
 *
 * Verify that the update succeeds and the new display_order is returned. This
 * capability allows sellers to optimize variant presentation by placing popular
 * options first or organizing options in logical sequences (e.g., size
 * progression, price order, popularity ranking).
 *
 * Steps:
 *
 * 1. Create admin account
 * 2. Create product category
 * 3. Create seller account
 * 4. Create product sale
 * 5. Create variant attribute (Color)
 * 6. Create multiple variant values with initial display orders
 * 7. Update one variant value's display_order
 * 8. Verify updated display_order is returned correctly
 */
export async function test_api_variant_value_update_display_order_reordering(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
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

  // Step 2: Create product category
  const categoryData = {
    parent_id: null,
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    image_url: typia.random<string & tags.Format<"uri">>(),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    status: "active" as const,
  } satisfies IShoppingMallCategory.ICreate;

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    { body: categoryData },
  );
  typia.assert(category);

  // Step 3: Create seller account
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.name(2),
    business_description: RandomGenerator.paragraph({ sentences: 5 }),
    store_name: RandomGenerator.name(2),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // Step 4: Create product sale
  const saleData = {
    code: RandomGenerator.alphaNumeric(10),
    shopping_mall_category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(1),
    condition: "new" as const,
    short_description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
    meta_keywords: RandomGenerator.name(3),
    weight: typia.random<number & tags.Minimum<0>>(),
    dimension_length: typia.random<number & tags.Minimum<0>>(),
    dimension_width: typia.random<number & tags.Minimum<0>>(),
    dimension_height: typia.random<number & tags.Minimum<0>>(),
    manufacturer: RandomGenerator.name(2),
    return_policy_days: RandomGenerator.pick([0, 7, 14, 30, 60] as const),
    warranty_info: RandomGenerator.paragraph({ sentences: 5 }),
    status: "draft",
  } satisfies IShoppingMallSale.ICreate;

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    { body: saleData },
  );
  typia.assert(sale);

  // Step 5: Create variant attribute (Color)
  const attributeData = {
    name: "Color",
    display_order: 0,
  } satisfies IShoppingMallSaleVariantAttribute.ICreate;

  const attribute =
    await api.functional.shoppingMall.seller.sales.variantAttributes.create(
      connection,
      {
        saleCode: sale.code,
        body: attributeData,
      },
    );
  typia.assert(attribute);

  // Step 6: Create multiple variant values with initial display orders
  const colorValues = ["Red", "Blue", "Green"];
  const createdValues: IShoppingMallSaleVariantValue[] = [];

  for (let i = 0; i < colorValues.length; i++) {
    const valueData = {
      value: colorValues[i],
      display_order: i + 1,
      color_code: null,
    } satisfies IShoppingMallSaleVariantValue.ICreate;

    const variantValue =
      await api.functional.shoppingMall.seller.sales.variantAttributes.values.create(
        connection,
        {
          saleCode: sale.code,
          variantAttributeId: attribute.id,
          body: valueData,
        },
      );
    typia.assert(variantValue);
    createdValues.push(variantValue);
  }

  // Step 7: Update one variant value's display_order (move "Green" from position 3 to position 1)
  const targetValue = createdValues[2];
  const updateData = {
    display_order: 0,
  } satisfies IShoppingMallSaleVariantValue.IUpdate;

  const updatedValue =
    await api.functional.shoppingMall.seller.sales.variantAttributes.values.update(
      connection,
      {
        saleCode: sale.code,
        variantAttributeId: attribute.id,
        valueId: targetValue.id,
        body: updateData,
      },
    );
  typia.assert(updatedValue);

  // Step 8: Verify updated display_order is returned correctly
  TestValidator.equals(
    "display_order updated successfully",
    updatedValue.display_order,
    0,
  );
  TestValidator.equals(
    "variant value ID matches",
    updatedValue.id,
    targetValue.id,
  );
  TestValidator.equals(
    "variant value name unchanged",
    updatedValue.value,
    "Green",
  );
}

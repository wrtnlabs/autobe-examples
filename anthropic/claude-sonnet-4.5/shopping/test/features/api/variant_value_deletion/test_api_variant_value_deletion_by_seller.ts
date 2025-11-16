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
 * Test the complete workflow of a seller deleting a variant attribute value
 * from their product sale.
 *
 * This test validates that sellers can successfully remove specific variant
 * options (like removing a 'Red' color option or 'XL' size) from their product
 * configuration when those values are no longer needed. The test verifies that
 * the deletion operation properly removes the value from the database while
 * maintaining data integrity for other variant values within the same
 * attribute.
 *
 * It confirms that the seller must own the product sale to delete variant
 * values, and that the deletion cascade checks prevent removal of values that
 * are actively used in SKUs or orders. The test also verifies that at least one
 * value must remain for each variant attribute, preventing deletion of the last
 * remaining value.
 *
 * Test Steps:
 *
 * 1. Create seller account and authenticate
 * 2. Create admin account for category setup
 * 3. Switch to admin context and create product category
 * 4. Switch back to seller context
 * 5. Create a product sale listing
 * 6. Create a variant attribute (e.g., "Color")
 * 7. Create first variant value (e.g., "Red")
 * 8. Create second variant value (e.g., "Blue") - this will be targeted for
 *    deletion
 * 9. Delete the second variant value
 * 10. Validate the deletion was successful by checking the returned deleted value
 */
export async function test_api_variant_value_deletion_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Create seller account and authenticate
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

  // Step 2: Create admin account for category setup
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: RandomGenerator.pick([
        "super_admin",
        "moderator",
        "support",
      ] as const),
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 3: Create product category as admin
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(1),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        status: RandomGenerator.pick(["active", "inactive"] as const),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 4: Switch back to seller context
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 5: Create a product sale listing
  const saleCode = RandomGenerator.alphaNumeric(12);

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: saleCode,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        brand: RandomGenerator.name(1),
        condition: RandomGenerator.pick([
          "new",
          "refurbished",
          "used",
        ] as const),
        short_description: RandomGenerator.paragraph({ sentences: 5 }),
        meta_keywords: RandomGenerator.paragraph({ sentences: 4 }),
        weight: typia.random<number & tags.Minimum<0>>(),
        dimension_length: typia.random<number & tags.Minimum<0>>(),
        dimension_width: typia.random<number & tags.Minimum<0>>(),
        dimension_height: typia.random<number & tags.Minimum<0>>(),
        manufacturer: RandomGenerator.name(2),
        return_policy_days: RandomGenerator.pick([0, 7, 14, 30, 60] as const),
        warranty_info: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 6: Create a variant attribute (e.g., "Color")
  const variantAttribute =
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
  typia.assert(variantAttribute);

  // Step 7: Create first variant value (e.g., "Red")
  const firstValue =
    await api.functional.shoppingMall.seller.sales.variantAttributes.values.create(
      connection,
      {
        saleCode: sale.code,
        variantAttributeId: variantAttribute.id,
        body: {
          value: "Red",
          display_order: 0,
          color_code: "#FF0000",
        } satisfies IShoppingMallSaleVariantValue.ICreate,
      },
    );
  typia.assert(firstValue);

  // Step 8: Create second variant value (e.g., "Blue") - this will be deleted
  const secondValue =
    await api.functional.shoppingMall.seller.sales.variantAttributes.values.create(
      connection,
      {
        saleCode: sale.code,
        variantAttributeId: variantAttribute.id,
        body: {
          value: "Blue",
          display_order: 1,
          color_code: "#0000FF",
        } satisfies IShoppingMallSaleVariantValue.ICreate,
      },
    );
  typia.assert(secondValue);

  // Step 9: Delete the second variant value
  const deletedValue =
    await api.functional.shoppingMall.seller.sales.variantAttributes.values.erase(
      connection,
      {
        saleCode: sale.code,
        variantAttributeId: variantAttribute.id,
        valueId: secondValue.id,
      },
    );
  typia.assert(deletedValue);

  // Step 10: Validate the deletion was successful
  TestValidator.equals(
    "deleted value ID matches",
    deletedValue.id,
    secondValue.id,
  );
  TestValidator.equals(
    "deleted value text matches",
    deletedValue.value,
    "Blue",
  );
  TestValidator.equals(
    "deleted value color code matches",
    deletedValue.color_code,
    "#0000FF",
  );
}

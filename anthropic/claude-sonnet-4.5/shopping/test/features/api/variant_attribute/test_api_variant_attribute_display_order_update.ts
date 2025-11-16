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
 * Test updating a variant attribute's display order to control the sequence of
 * variant selectors presented to buyers.
 *
 * This test validates that sellers can reorganize how variant options appear in
 * the product configuration interface by modifying the display_order field. The
 * test creates a seller account, category, product sale, and multiple variant
 * attributes (e.g., Color, Size, Material) with different display orders. Then
 * it updates one variant attribute's display_order to change its presentation
 * position. This ensures the variant selector interface can be optimized for
 * the best buyer experience by allowing sellers to prioritize the most
 * important variation dimensions.
 */
export async function test_api_variant_attribute_display_order_update(
  connection: api.IConnection,
) {
  // Step 1: Create a seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph({ sentences: 5 }),
      store_name: RandomGenerator.name(2),
      href: "https://marketplace.example.com/seller/register",
      referrer: "https://marketplace.example.com/home",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Create an admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: "https://marketplace.example.com/admin/register",
      referrer: "https://marketplace.example.com",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 3: Switch to admin context and create a category
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://marketplace.example.com/admin/login",
      referrer: "https://marketplace.example.com/admin",
    } satisfies IShoppingMallAdmin.ILogin,
  });

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

  // Step 4: Switch to seller context
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://marketplace.example.com/seller/login",
      referrer: "https://marketplace.example.com/seller",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 5: Create a product sale
  const saleCode = RandomGenerator.alphaNumeric(12);
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: saleCode,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new",
        return_policy_days: 30,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 6: Create multiple variant attributes with different display orders
  const colorAttribute =
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
  typia.assert(colorAttribute);

  const sizeAttribute =
    await api.functional.shoppingMall.seller.sales.variantAttributes.create(
      connection,
      {
        saleCode: saleCode,
        body: {
          name: "Size",
          display_order: 1,
        } satisfies IShoppingMallSaleVariantAttribute.ICreate,
      },
    );
  typia.assert(sizeAttribute);

  const materialAttribute =
    await api.functional.shoppingMall.seller.sales.variantAttributes.create(
      connection,
      {
        saleCode: saleCode,
        body: {
          name: "Material",
          display_order: 2,
        } satisfies IShoppingMallSaleVariantAttribute.ICreate,
      },
    );
  typia.assert(materialAttribute);

  // Step 7: Update the Color attribute's display_order from 0 to 5
  const newDisplayOrder = 5;
  const updatedAttribute =
    await api.functional.shoppingMall.seller.sales.variantAttributes.update(
      connection,
      {
        saleCode: saleCode,
        variantAttributeId: colorAttribute.id,
        body: {
          display_order: newDisplayOrder,
        } satisfies IShoppingMallSaleVariantAttribute.IUpdate,
      },
    );
  typia.assert(updatedAttribute);

  // Step 8: Validate that the display_order was successfully updated
  TestValidator.equals(
    "variant attribute display_order should be updated",
    updatedAttribute.display_order,
    newDisplayOrder,
  );

  TestValidator.equals(
    "variant attribute ID should remain the same",
    updatedAttribute.id,
    colorAttribute.id,
  );

  TestValidator.equals(
    "variant attribute name should remain unchanged",
    updatedAttribute.name,
    "Color",
  );
}

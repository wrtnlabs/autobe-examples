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
 * Test updating a variant attribute's name for an existing product sale.
 *
 * This scenario validates the complete workflow of creating a seller account,
 * creating a category for product organization, creating a product sale with
 * category assignment, adding a variant attribute to define product variations
 * (e.g., 'Color'), and then updating that variant attribute's name (e.g.,
 * changing 'Color' to 'Product Color'). The test verifies that the variant
 * attribute name is successfully modified while maintaining all other
 * properties and relationships.
 */
export async function test_api_variant_attribute_name_update(
  connection: api.IConnection,
) {
  // Step 1: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph({ sentences: 3 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Create admin account for category creation
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

  // Step 3: Admin creates a category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: RandomGenerator.pick(["active", "inactive"] as const),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 4: Switch back to seller account
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 5: Seller creates a product sale
  const saleCode = RandomGenerator.alphaNumeric(12);
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: saleCode,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        brand: RandomGenerator.name(1),
        condition: RandomGenerator.pick([
          "new",
          "refurbished",
          "used",
        ] as const),
        return_policy_days: RandomGenerator.pick([0, 7, 14, 30, 60] as const),
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 6: Create a variant attribute (e.g., 'Color')
  const originalAttributeName = "Color";
  const variantAttribute =
    await api.functional.shoppingMall.seller.sales.variantAttributes.create(
      connection,
      {
        saleCode: saleCode,
        body: {
          name: originalAttributeName,
          display_order: 0,
        } satisfies IShoppingMallSaleVariantAttribute.ICreate,
      },
    );
  typia.assert(variantAttribute);
  TestValidator.equals(
    "original attribute name",
    variantAttribute.name,
    originalAttributeName,
  );

  // Step 7: Update the variant attribute name (e.g., to 'Product Color')
  const updatedAttributeName = "Product Color";
  const updatedAttribute =
    await api.functional.shoppingMall.seller.sales.variantAttributes.update(
      connection,
      {
        saleCode: saleCode,
        variantAttributeId: variantAttribute.id,
        body: {
          name: updatedAttributeName,
        } satisfies IShoppingMallSaleVariantAttribute.IUpdate,
      },
    );
  typia.assert(updatedAttribute);

  // Step 8: Validate the update
  TestValidator.equals(
    "attribute name updated",
    updatedAttribute.name,
    updatedAttributeName,
  );
  TestValidator.equals(
    "attribute ID unchanged",
    updatedAttribute.id,
    variantAttribute.id,
  );
  TestValidator.equals(
    "sale association unchanged",
    updatedAttribute.shopping_mall_sale_id,
    sale.id,
  );
  TestValidator.equals(
    "display order unchanged",
    updatedAttribute.display_order,
    variantAttribute.display_order,
  );
}

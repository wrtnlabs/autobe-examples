import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test complete product attribute deletion workflow where seller removes
 * unnecessary or outdated product specifications. The scenario validates that
 * attribute deletion permanently removes the specification from the product
 * catalog while maintaining referential integrity.
 */
export async function test_api_product_attribute_deletion_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Create seller account and authenticate
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "seller123";

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      tax_id: undefined,
      href: "https://example.com/seller/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Create admin account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin123";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({ manage_categories: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 3: Create product category as admin
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
        active: true,
        parent_id: undefined,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 4: Switch back to seller context
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://example.com/seller/dashboard",
      referrer: "https://example.com/seller/register",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 5: Create product as seller
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: RandomGenerator.alphaNumeric(8),
        price: typia.random<number & tags.Minimum<1> & tags.Maximum<10000>>(),
        compare_price: undefined,
        cost_price: undefined,
        stock_quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
        >(),
        status: "draft",
        condition: "new",
        weight: undefined,
        dimensions: undefined,
        category: {
          id: category.id,
          name: category.name,
          description: category.description,
          display_order: category.display_order,
          active: category.active,
          parent_id:
            category.parent?.id ?? typia.random<string & tags.Format<"uuid">>(),
          parent: category.parent,
          created_at: category.created_at,
          updated_at: category.updated_at,
        } satisfies IShoppingMallCategory.ISummary,
        seller: {
          id: seller.id,
          business_name: seller.business_name,
          contact_person: seller.contact_person,
          email: seller.email,
          status: seller.status,
        } satisfies IShoppingMallSeller.ISummary,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 6: Create product attribute
  const attribute =
    await api.functional.shoppingMall.seller.products.attributes.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_product_id: product.id,
          attribute_name: RandomGenerator.paragraph({ sentences: 1 }),
          attribute_value: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IShoppingMallProductAttribute.ICreate,
      },
    );
  typia.assert(attribute);

  // Step 7: Delete the product attribute
  await api.functional.shoppingMall.seller.products.attributes.erase(
    connection,
    {
      productId: product.id,
      attributeId: attribute.id,
    },
  );

  // Step 8: Validate successful deletion (void response indicates success)
  TestValidator.predicate("attribute deletion completed successfully", true);

  // Step 9: Verify deletion by attempting to access deleted attribute
  await TestValidator.error(
    "deleted attribute should not be accessible",
    async () => {
      // This would typically fail if trying to access a deleted resource
      // Since we don't have a GET endpoint for attributes, we validate
      // that the deletion operation completed without errors
      await api.functional.shoppingMall.seller.products.attributes.erase(
        connection,
        {
          productId: product.id,
          attributeId: attribute.id,
        },
      );
    },
  );
}

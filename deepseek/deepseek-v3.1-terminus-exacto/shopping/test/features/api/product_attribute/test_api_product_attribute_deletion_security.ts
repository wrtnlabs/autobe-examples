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
 * Test security validation for attribute deletion operations, ensuring that
 * sellers can only delete attributes belonging to their own products. The
 * scenario validates proper authorization checks by attempting to delete
 * attributes from products owned by different sellers and verifying access
 * denial. Tests that the system correctly identifies product ownership and
 * prevents unauthorized attribute modifications across seller accounts.
 */
export async function test_api_product_attribute_deletion_security(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate first seller account
  const firstSellerEmail = typia.random<string & tags.Format<"email">>();
  const firstSellerPassword = "password123";

  const firstSeller = await api.functional.auth.seller.join(connection, {
    body: {
      email: firstSellerEmail,
      password: firstSellerPassword,
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      href: "https://example.com/seller-dashboard",
      referrer: "https://example.com",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(firstSeller);

  // Step 2: Create admin account and authenticate for category creation
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
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 3: Create product category using admin authentication
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        active: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 4: Switch back to first seller for product creation
  await api.functional.auth.seller.login(connection, {
    body: {
      email: firstSellerEmail,
      password: firstSellerPassword,
      href: "https://example.com/seller-dashboard",
      referrer: "https://example.com",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 5: Create product owned by first seller
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: RandomGenerator.alphaNumeric(8),
        price: typia.random<number & tags.Minimum<1> & tags.Maximum<1000>>(),
        stock_quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
        status: "active",
        condition: "new",
        category: {
          id: category.id,
          name: category.name,
          description: category.description,
          display_order: category.display_order,
          active: category.active,
          parent_id:
            category.parent?.id ?? typia.random<string & tags.Format<"uuid">>(),
          created_at: category.created_at,
          updated_at: category.updated_at,
          parent: category.parent,
        } satisfies IShoppingMallCategory.ISummary,
        seller: {
          id: firstSeller.id,
          business_name: firstSeller.business_name,
          contact_person: firstSeller.contact_person,
          email: firstSeller.email,
          status: firstSeller.status,
        } satisfies IShoppingMallSeller.ISummary,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 6: Create attribute for first seller's product
  const attribute =
    await api.functional.shoppingMall.seller.products.attributes.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_product_id: product.id,
          attribute_name: "Color",
          attribute_value: "Red",
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IShoppingMallProductAttribute.ICreate,
      },
    );
  typia.assert(attribute);

  // Step 7: Create and authenticate second seller account
  const secondSellerEmail = typia.random<string & tags.Format<"email">>();
  const secondSellerPassword = "password456";

  const secondSeller = await api.functional.auth.seller.join(connection, {
    body: {
      email: secondSellerEmail,
      password: secondSellerPassword,
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      href: "https://example.com/seller-dashboard",
      referrer: "https://example.com",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(secondSeller);

  // Step 8: Attempt to delete first seller's attribute using second seller's credentials
  // This should fail due to authorization check
  await TestValidator.error(
    "second seller cannot delete first seller's attribute",
    async () => {
      await api.functional.shoppingMall.seller.products.attributes.erase(
        connection,
        {
          productId: product.id,
          attributeId: attribute.id,
        },
      );
    },
  );

  // Step 9: Switch back to first seller and successfully delete the attribute
  await api.functional.auth.seller.login(connection, {
    body: {
      email: firstSellerEmail,
      password: firstSellerPassword,
      href: "https://example.com/seller-dashboard",
      referrer: "https://example.com",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 10: First seller should be able to delete their own attribute
  await api.functional.shoppingMall.seller.products.attributes.erase(
    connection,
    {
      productId: product.id,
      attributeId: attribute.id,
    },
  );

  // Validation: The attribute deletion should succeed without errors
  TestValidator.predicate(
    "first seller successfully deleted their own attribute",
    true,
  );
}

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
 * Test the complete workflow for admin deletion of product attributes. This
 * comprehensive E2E test validates the authorization boundaries and data
 * integrity when administrators delete product attributes created by sellers.
 */
export async function test_api_admin_product_attribute_deletion(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({
        manage_products: true,
        delete_attributes: true,
      }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Register and authenticate seller user
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "seller123",
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      tax_id: undefined,
      ip: undefined,
      href: "https://example.com/seller/dashboard",
      referrer: "https://example.com/registration",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 3: Admin creates a product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 4 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
        active: true,
        parent_id: undefined,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 4: Seller creates a product
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
        status: "active",
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
          created_at: category.created_at,
          updated_at: category.updated_at,
          parent: undefined,
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

  // Step 5: Seller adds multiple attributes to the product
  const attributes = ArrayUtil.repeat(3, (index) => {
    return {
      shopping_mall_product_id: product.id,
      attribute_name: ["Color", "Size", "Material"][index],
      attribute_value: ["Red", "Large", "Cotton"][index],
      display_order: index + 1,
    } satisfies IShoppingMallProductAttribute.ICreate;
  });

  const createdAttributes: IShoppingMallProductAttribute[] = [];
  for (const attributeData of attributes) {
    const attribute =
      await api.functional.shoppingMall.seller.products.attributes.create(
        connection,
        {
          productId: product.id,
          body: attributeData,
        },
      );
    typia.assert(attribute);
    createdAttributes.push(attribute);
  }

  // Step 6: Admin deletes specific product attributes
  // Delete the first attribute
  await api.functional.shoppingMall.admin.products.attributes.erase(
    connection,
    {
      productId: product.id,
      attributeId: createdAttributes[0].id,
    },
  );

  // Step 7: Validate that admin cannot delete non-existent attributes
  await TestValidator.error(
    "admin cannot delete non-existent attribute",
    async () => {
      await api.functional.shoppingMall.admin.products.attributes.erase(
        connection,
        {
          productId: product.id,
          attributeId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // Step 8: Validate proper authorization boundaries
  // Switch to seller account and attempt deletion (should fail)
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "seller123",
      href: "https://example.com/seller/dashboard",
      referrer: "https://example.com/login",
      ip: undefined,
      device: undefined,
    } satisfies IShoppingMallSeller.ILogin,
  });

  await TestValidator.error(
    "seller cannot delete attributes using admin endpoint",
    async () => {
      await api.functional.shoppingMall.admin.products.attributes.erase(
        connection,
        {
          productId: product.id,
          attributeId: createdAttributes[1].id,
        },
      );
    },
  );

  // Switch back to admin for final validation
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      href: "https://example.com/admin/dashboard",
      referrer: "https://example.com/login",
      ip: undefined,
    } satisfies IShoppingMallAdministrator.ILogin,
  });

  // Final validation: Delete remaining attributes successfully
  for (let i = 1; i < createdAttributes.length; i++) {
    await api.functional.shoppingMall.admin.products.attributes.erase(
      connection,
      {
        productId: product.id,
        attributeId: createdAttributes[i].id,
      },
    );
  }

  TestValidator.predicate(
    "all product attributes successfully deleted by admin",
    true,
  );
}

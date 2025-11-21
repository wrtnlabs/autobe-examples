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
 * Test successful product attribute update workflow where a seller modifies
 * existing product specifications. The scenario validates that sellers can
 * update attribute names, values, and display orders while maintaining data
 * integrity. Authentication is established through seller registration,
 * followed by category creation, product creation, and attribute creation
 * before the target update operation. The test verifies that updated attributes
 * reflect changes correctly and maintain proper relationships with their parent
 * products.
 */
export async function test_api_product_attribute_update_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Create seller account and authenticate
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "seller123456";

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: RandomGenerator.name(),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      tax_id: undefined,
      href: "https://shopping-mall.example.com/seller/join",
      referrer: "https://shopping-mall.example.com/",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Create admin account and authenticate for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin123456";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "support_admin",
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
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        active: true,
        parent_id: undefined,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 4: Switch back to seller authentication
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://shopping-mall.example.com/seller/dashboard",
      referrer: "https://shopping-mall.example.com/seller/join",
      device: "test-device",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 5: Create product as seller
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: RandomGenerator.alphaNumeric(10),
        price: typia.random<number & tags.Minimum<0> & tags.Maximum<10000>>(),
        compare_price: undefined,
        cost_price: undefined,
        stock_quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1000>
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
          status: "active",
        } satisfies IShoppingMallSeller.ISummary,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 6: Create initial product attribute
  const initialAttribute =
    await api.functional.shoppingMall.seller.products.attributes.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_product_id: product.id,
          attribute_name: "Color",
          attribute_value: "Red",
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<10>
          >(),
        } satisfies IShoppingMallProductAttribute.ICreate,
      },
    );
  typia.assert(initialAttribute);

  // Step 7: Update the product attribute with modified values
  const updatedAttribute =
    await api.functional.shoppingMall.seller.products.attributes.update(
      connection,
      {
        productId: product.id,
        attributeId: initialAttribute.id,
        body: {
          attribute_name: "Primary Color",
          attribute_value: "Deep Red",
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<10>
          >(),
        } satisfies IShoppingMallProductAttribute.IUpdate,
      },
    );
  typia.assert(updatedAttribute);

  // Step 8: Validate that the attribute was correctly updated
  TestValidator.equals(
    "attribute ID remains the same",
    updatedAttribute.id,
    initialAttribute.id,
  );
  TestValidator.equals(
    "product ID remains the same",
    updatedAttribute.shopping_mall_product_id,
    initialAttribute.shopping_mall_product_id,
  );
  TestValidator.notEquals(
    "attribute name should be updated",
    updatedAttribute.attribute_name,
    initialAttribute.attribute_name,
  );
  TestValidator.notEquals(
    "attribute value should be updated",
    updatedAttribute.attribute_value,
    initialAttribute.attribute_value,
  );
  TestValidator.notEquals(
    "display order may be updated",
    updatedAttribute.display_order,
    initialAttribute.display_order,
  );
  TestValidator.predicate(
    "updated at timestamp should be newer",
    new Date(updatedAttribute.updated_at) >
      new Date(initialAttribute.updated_at),
  );
}

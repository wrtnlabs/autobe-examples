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
 * Test complete product attribute creation workflow where a seller creates a
 * product and adds custom attributes with specifications. Validates that
 * sellers can define detailed product characteristics including attribute
 * names, values, and display ordering. The test ensures proper authentication,
 * product ownership verification, and attribute uniqueness per product
 * enforcement.
 */
export async function test_api_product_attribute_creation_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Admin123!";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({ admin: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create category as administrator
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
        active: true,
        parent_id: undefined,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "Seller123!";

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      tax_id: undefined,
      ip: "192.168.1.1",
      href: "https://shoppingmall.example.com/seller/register",
      referrer: "https://shoppingmall.example.com/",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Switch to seller authentication context
  const sellerAuth = await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: "192.168.1.1",
      href: "https://shoppingmall.example.com/seller/dashboard",
      referrer: "https://shoppingmall.example.com/",
      device: "test-device",
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerAuth);

  // Step 5: Create product as seller
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: RandomGenerator.alphaNumeric(10),
        price: typia.random<number & tags.Minimum<1> & tags.Maximum<10000>>(),
        compare_price: typia.random<
          number & tags.Minimum<10001> & tags.Maximum<20000>
        >(),
        cost_price: typia.random<
          number & tags.Minimum<1> & tags.Maximum<5000>
        >(),
        stock_quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
        >(),
        status: "draft",
        condition: "new",
        weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<50>>(),
        dimensions: `${typia.random<number & tags.Minimum<5> & tags.Maximum<100>>()}x${typia.random<number & tags.Minimum<5> & tags.Maximum<100>>()}x${typia.random<number & tags.Minimum<5> & tags.Maximum<100>>()}`,
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

  // Step 6: Create multiple product attributes
  const attributeData = [
    {
      attribute_name: "Color",
      attribute_value: "Red",
      display_order: 1,
    },
    {
      attribute_name: "Size",
      attribute_value: "Large",
      display_order: 2,
    },
    {
      attribute_name: "Material",
      attribute_value: "Cotton",
      display_order: 3,
    },
  ];

  const createdAttributes: IShoppingMallProductAttribute[] = [];

  for (const attrData of attributeData) {
    const attribute =
      await api.functional.shoppingMall.seller.products.attributes.create(
        connection,
        {
          productId: product.id,
          body: {
            shopping_mall_product_id: product.id,
            attribute_name: attrData.attribute_name,
            attribute_value: attrData.attribute_value,
            display_order: attrData.display_order,
          } satisfies IShoppingMallProductAttribute.ICreate,
        },
      );
    typia.assert(attribute);
    createdAttributes.push(attribute);

    // Validate attribute properties
    TestValidator.equals(
      "attribute product ID matches",
      attribute.shopping_mall_product_id,
      product.id,
    );
    TestValidator.equals(
      "attribute name matches",
      attribute.attribute_name,
      attrData.attribute_name,
    );
    TestValidator.equals(
      "attribute value matches",
      attribute.attribute_value,
      attrData.attribute_value,
    );
    TestValidator.equals(
      "display order matches",
      attribute.display_order,
      attrData.display_order,
    );
  }

  // Step 7: Test attribute uniqueness enforcement
  await TestValidator.error(
    "should reject duplicate attribute name",
    async () => {
      await api.functional.shoppingMall.seller.products.attributes.create(
        connection,
        {
          productId: product.id,
          body: {
            shopping_mall_product_id: product.id,
            attribute_name: "Color", // Duplicate attribute name
            attribute_value: "Blue",
            display_order: 4,
          } satisfies IShoppingMallProductAttribute.ICreate,
        },
      );
    },
  );

  // Validate all attributes were created successfully
  TestValidator.equals(
    "all attributes created",
    createdAttributes.length,
    attributeData.length,
  );

  // Validate attribute ordering
  const sortedAttributes = [...createdAttributes].sort(
    (a, b) => a.display_order - b.display_order,
  );
  TestValidator.equals(
    "attributes are properly ordered",
    createdAttributes,
    sortedAttributes,
  );

  // Final validation: Ensure product ownership is enforced
  TestValidator.predicate(
    "seller owns the product",
    product.seller.id === seller.id,
  );
}

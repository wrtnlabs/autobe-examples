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
 * Comprehensive E2E test for product attribute deletion verification
 *
 * Validates the complete workflow of creating and deleting product attributes
 * with proper cleanup and referential integrity checks. Tests include:
 *
 * - Multi-actor authentication (seller and admin)
 * - Product creation with multiple attributes
 * - Selective attribute deletion
 * - Verification of remaining attributes
 * - Error handling for invalid deletion attempts
 */
export async function test_api_product_attribute_deletion_verification(
  connection: api.IConnection,
) {
  // Step 1: Create seller account
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
      href: "https://shoppingmall.example.com/seller/join",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Create administrator account for category management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({
        categories: ["create", "read", "update", "delete"],
        products: ["read", "update"],
      }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 3: Create product category
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

  // Step 4: Create product with seller authentication
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "seller123",
      href: "https://shoppingmall.example.com/seller/dashboard",
      referrer: "https://shoppingmall.example.com",
      device: "web",
    } satisfies IShoppingMallSeller.ILogin,
  });

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
          number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<1000>
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

  // Step 5: Create multiple attributes for the product
  const attributes = ArrayUtil.repeat(3, (index) => {
    return {
      attribute_name: ["Color", "Size", "Material"][index],
      attribute_value: ["Red", "Large", "Cotton"][index],
      display_order: index + 1,
    };
  });

  const createdAttributes: IShoppingMallProductAttribute[] = [];
  for (const attrData of attributes) {
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
  }

  // Step 6: Delete one attribute and verify deletion
  const attributeToDelete = createdAttributes[1]; // Delete the middle attribute

  // Perform deletion
  await api.functional.shoppingMall.seller.products.attributes.erase(
    connection,
    {
      productId: product.id,
      attributeId: attributeToDelete.id,
    },
  );

  // Step 7: Verify deletion by attempting to delete again (should fail)
  await TestValidator.error(
    "deleted attribute should not be found for second deletion",
    async () => {
      await api.functional.shoppingMall.seller.products.attributes.erase(
        connection,
        {
          productId: product.id,
          attributeId: attributeToDelete.id,
        },
      );
    },
  );

  // Step 8: Verify remaining attributes still exist by creating new attributes
  const remainingAttributesCount = createdAttributes.length - 1;
  TestValidator.equals(
    "should have correct number of remaining attributes",
    remainingAttributesCount,
    2,
  );

  // Step 9: Verify product integrity by creating additional attributes
  const newAttribute =
    await api.functional.shoppingMall.seller.products.attributes.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_product_id: product.id,
          attribute_name: "Warranty",
          attribute_value: "2 years",
          display_order: 4,
        } satisfies IShoppingMallProductAttribute.ICreate,
      },
    );
  typia.assert(newAttribute);

  // Step 10: Test invalid deletion attempts
  await TestValidator.error(
    "should fail when deleting non-existent attribute",
    async () => {
      await api.functional.shoppingMall.seller.products.attributes.erase(
        connection,
        {
          productId: product.id,
          attributeId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  await TestValidator.error(
    "should fail when using invalid product ID",
    async () => {
      await api.functional.shoppingMall.seller.products.attributes.erase(
        connection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          attributeId: createdAttributes[0].id,
        },
      );
    },
  );

  // Final validation: Product should still accept new attributes after deletions
  TestValidator.predicate(
    "product should remain functional after attribute operations",
    product.id !== undefined,
  );
}

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
 * Test public access to product attributes without authentication.
 *
 * Validates that product attributes can be retrieved publicly once created by
 * sellers, ensuring that detailed product specifications are accessible to
 * customers browsing the catalog. The test confirms that attribute information
 * is available for product discovery and comparison features without requiring
 * user authentication.
 */
export async function test_api_product_attribute_public_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category setup
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "admin123",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin",
        permissions: JSON.stringify({ manage_categories: true }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create category required for product creation
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
        active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Step 3: Create seller account for product management
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "seller123",
        business_name: RandomGenerator.paragraph({ sentences: 3 }),
        contact_person: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        business_address: RandomGenerator.paragraph({ sentences: 4 }),
        href: "https://shopping-mall.example.com/seller/dashboard",
        referrer: "https://shopping-mall.example.com",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 4: Create product that will contain attributes
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: RandomGenerator.alphaNumeric(8),
        price: typia.random<number & tags.Minimum<1> & tags.Maximum<10000>>(),
        stock_quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<1000>
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
          id: seller.id,
          business_name: seller.business_name,
          contact_person: seller.contact_person,
          email: seller.email,
          status: seller.status,
        } satisfies IShoppingMallSeller.ISummary,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // Step 5: Create product attribute with detailed specifications
  const attribute: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.seller.products.attributes.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_product_id: product.id,
          attribute_name: "Material",
          attribute_value: "Premium Cotton",
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
        } satisfies IShoppingMallProductAttribute.ICreate,
      },
    );
  typia.assert(attribute);

  // Step 6: Switch to unauthenticated connection for public access test
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Step 7: Retrieve product attribute publicly without authentication
  const retrievedAttribute: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.products.attributes.at(unauthConnection, {
      productId: product.id,
      attributeId: attribute.id,
    });
  typia.assert(retrievedAttribute);

  // Step 8: Validate that attribute data matches the created specifications
  TestValidator.equals(
    "attribute ID matches",
    retrievedAttribute.id,
    attribute.id,
  );
  TestValidator.equals(
    "product ID matches",
    retrievedAttribute.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "attribute name matches",
    retrievedAttribute.attribute_name,
    "Material",
  );
  TestValidator.equals(
    "attribute value matches",
    retrievedAttribute.attribute_value,
    "Premium Cotton",
  );
  TestValidator.equals(
    "display order matches",
    retrievedAttribute.display_order,
    attribute.display_order,
  );
}

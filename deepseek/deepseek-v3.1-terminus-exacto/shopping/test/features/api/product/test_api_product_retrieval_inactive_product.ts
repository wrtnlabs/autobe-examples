import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test retrieval of product information for products with inactive or archived
 * status.
 *
 * This test validates that the system handles different product statuses
 * appropriately and returns product details even when the product is not
 * currently available for purchase. The scenario involves creating
 * administrative and seller accounts, establishing product categories, and
 * creating a product with inactive status to test retrieval functionality.
 *
 * The test ensures that:
 *
 * 1. Inactive products remain accessible for informational purposes
 * 2. Product status information is clearly indicated in responses
 * 3. Multi-actor authentication contexts work correctly
 * 4. Product details are complete regardless of status
 */
export async function test_api_product_retrieval_inactive_product(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for category management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role: "support_admin",
        permissions: JSON.stringify({ manage_categories: true }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create product category
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
  const sellerPassword = "SellerPassword123!";

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        business_name: RandomGenerator.paragraph({ sentences: 2 }),
        contact_person: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        business_address: RandomGenerator.content({ paragraphs: 1 }),
        href: "https://test-seller.example.com",
        referrer: "https://test-platform.example.com",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 4: Create product with inactive status
  const inactiveProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: RandomGenerator.alphaNumeric(8),
        price: typia.random<number & tags.Minimum<1> & tags.Maximum<10000>>(),
        stock_quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        status: "inactive",
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
    });
  typia.assert(inactiveProduct);

  // Step 5: Test product retrieval as unauthenticated user
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  const retrievedProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.products.at(unauthConn, {
      productId: inactiveProduct.id,
    });
  typia.assert(retrievedProduct);

  // Validate that inactive product details are correctly returned
  TestValidator.equals(
    "product ID matches",
    retrievedProduct.id,
    inactiveProduct.id,
  );
  TestValidator.equals(
    "product name matches",
    retrievedProduct.name,
    inactiveProduct.name,
  );
  TestValidator.equals(
    "product description matches",
    retrievedProduct.description,
    inactiveProduct.description,
  );
  TestValidator.equals(
    "product SKU matches",
    retrievedProduct.sku,
    inactiveProduct.sku,
  );
  TestValidator.equals(
    "product price matches",
    retrievedProduct.price,
    inactiveProduct.price,
  );
  TestValidator.equals(
    "product status is inactive",
    retrievedProduct.status,
    "inactive",
  );
  TestValidator.equals(
    "product condition matches",
    retrievedProduct.condition,
    inactiveProduct.condition,
  );
  TestValidator.equals(
    "product stock quantity matches",
    retrievedProduct.stock_quantity,
    inactiveProduct.stock_quantity,
  );

  // Validate category information
  TestValidator.equals(
    "category ID matches",
    retrievedProduct.category.id,
    category.id,
  );
  TestValidator.equals(
    "category name matches",
    retrievedProduct.category.name,
    category.name,
  );

  // Validate seller information
  TestValidator.equals(
    "seller ID matches",
    retrievedProduct.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "seller business name matches",
    retrievedProduct.seller.business_name,
    seller.business_name,
  );

  // Validate timestamp properties
  TestValidator.predicate(
    "product has creation timestamp",
    retrievedProduct.created_at !== undefined,
  );
  TestValidator.predicate(
    "product has update timestamp",
    retrievedProduct.updated_at !== undefined,
  );

  // Step 6: Test product retrieval as seller
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://test-seller.example.com",
      referrer: "https://test-platform.example.com",
    } satisfies IShoppingMallSeller.ILogin,
  });

  const sellerRetrievedProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.products.at(connection, {
      productId: inactiveProduct.id,
    });
  typia.assert(sellerRetrievedProduct);

  TestValidator.equals(
    "seller sees same product ID",
    sellerRetrievedProduct.id,
    inactiveProduct.id,
  );
  TestValidator.equals(
    "seller sees inactive status",
    sellerRetrievedProduct.status,
    "inactive",
  );

  // Step 7: Test product retrieval as admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://test-admin.example.com",
      referrer: "https://test-platform.example.com",
    } satisfies IShoppingMallAdministrator.ILogin,
  });

  const adminRetrievedProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.products.at(connection, {
      productId: inactiveProduct.id,
    });
  typia.assert(adminRetrievedProduct);

  TestValidator.equals(
    "admin sees same product ID",
    adminRetrievedProduct.id,
    inactiveProduct.id,
  );
  TestValidator.equals(
    "admin sees inactive status",
    adminRetrievedProduct.status,
    "inactive",
  );

  // Final validation: Ensure all retrieval methods return identical core product information
  TestValidator.equals(
    "all retrievals have same name",
    retrievedProduct.name,
    sellerRetrievedProduct.name,
  );
  TestValidator.equals(
    "all retrievals have same description",
    retrievedProduct.description,
    adminRetrievedProduct.description,
  );
  TestValidator.equals(
    "all retrievals have same price",
    retrievedProduct.price,
    sellerRetrievedProduct.price,
  );
  TestValidator.equals(
    "all retrievals have same status",
    retrievedProduct.status,
    adminRetrievedProduct.status,
  );
  TestValidator.equals(
    "all retrievals have same condition",
    retrievedProduct.condition,
    sellerRetrievedProduct.condition,
  );
  TestValidator.equals(
    "all retrievals have same SKU",
    retrievedProduct.sku,
    adminRetrievedProduct.sku,
  );
}

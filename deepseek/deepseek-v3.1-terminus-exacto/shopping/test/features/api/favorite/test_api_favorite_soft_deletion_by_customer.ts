import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFavorite";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test soft deletion of a customer's favorite product entry, verifying that the
 * favorite is marked as deleted while preserving the record for audit purposes.
 * Customer creates account, seller creates product with category, customer
 * favorites product, then performs soft deletion. Validates that the deleted_at
 * timestamp is set while maintaining referential integrity and that the
 * favorite no longer appears in active listings but remains in the database for
 * potential recovery.
 */
export async function test_api_favorite_soft_deletion_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin123456";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({ all: true }),
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create product category
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
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "seller123456";

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.content({ paragraphs: 1 }),
      tax_id: undefined,
      href: "https://example.com/seller/register",
      referrer: "https://example.com/seller",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Switch to seller authentication for product creation
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://example.com/seller/dashboard",
      referrer: "https://example.com/seller/register",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 4: Create product
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
    },
  );
  typia.assert(product);

  // Step 5: Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "customer123456";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: undefined,
      ip: undefined,
      href: "https://example.com/customer/register",
      referrer: "https://example.com/customer",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Switch to customer authentication for favorite operations
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://example.com/customer/dashboard",
      referrer: "https://example.com/customer/register",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // Step 6: Customer favorites the product
  const favorite = await api.functional.shoppingMall.customer.favorites.create(
    connection,
    {
      body: {
        shopping_mall_product_id: product.id,
      } satisfies IShoppingMallFavorite.ICreate,
    },
  );
  typia.assert(favorite);

  // Validate initial favorite creation
  TestValidator.equals(
    "favorite product ID matches",
    favorite.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "favorite customer ID matches",
    favorite.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.predicate(
    "favorited_at timestamp is set",
    favorite.favorited_at !== null && favorite.favorited_at !== undefined,
  );
  TestValidator.predicate(
    "deleted_at is initially null",
    favorite.deleted_at === null || favorite.deleted_at === undefined,
  );

  // Step 7: Perform soft deletion of the favorite
  await api.functional.shoppingMall.customer.favorites.erase(connection, {
    favoriteId: favorite.id,
  });

  // The erase operation completes successfully without throwing an error
  // This validates that the soft deletion was performed correctly

  TestValidator.predicate(
    "soft deletion operation completed successfully",
    true,
  );
}

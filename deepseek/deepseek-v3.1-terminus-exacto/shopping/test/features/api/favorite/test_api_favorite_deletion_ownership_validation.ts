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
 * Test that favorite deletion operations properly validate ownership to prevent
 * unauthorized access. This test validates that customers cannot delete
 * favorites that belong to other users, ensuring data security and privacy
 * protection. The test creates two customer accounts, a seller account, a
 * product category, and a product. Customer A marks the product as favorite,
 * then Customer B attempts to delete Customer A's favorite, which should fail
 * with proper error validation.
 */
export async function test_api_favorite_deletion_ownership_validation(
  connection: api.IConnection,
) {
  // Create admin account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "admin123",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role: "super_admin",
        permissions: JSON.stringify({ all: true }),
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // Create category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
        active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "seller123",
        business_name: RandomGenerator.paragraph({ sentences: 2 }),
        contact_person: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        business_address: RandomGenerator.content({ paragraphs: 1 }),
        href: "https://example.com/seller/join",
        referrer: "https://example.com/seller",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Create product
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: RandomGenerator.alphaNumeric(8),
        price: typia.random<number & tags.Minimum<1> & tags.Maximum<1000>>(),
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

  // Create Customer A
  const customerAEmail = typia.random<string & tags.Format<"email">>();
  const customerA: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerAEmail,
        password: "customer123",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        href: "https://example.com/customer/join",
        referrer: "https://example.com/customer",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customerA);

  // Customer A marks product as favorite
  const favorite: IShoppingMallFavorite =
    await api.functional.shoppingMall.customer.favorites.create(connection, {
      body: {
        shopping_mall_product_id: product.id,
      } satisfies IShoppingMallFavorite.ICreate,
    });
  typia.assert(favorite);

  // Create Customer B
  const customerBEmail = typia.random<string & tags.Format<"email">>();
  const customerB: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerBEmail,
        password: "customer123",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        href: "https://example.com/customer/join",
        referrer: "https://example.com/customer",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customerB);

  // Authenticate as Customer B
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerBEmail,
      password: "customer123",
      href: "https://example.com/customer/login",
      referrer: "https://example.com/customer",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // Customer B attempts to delete Customer A's favorite - should fail
  await TestValidator.error(
    "Customer B cannot delete Customer A's favorite",
    async () => {
      await api.functional.shoppingMall.customer.favorites.erase(connection, {
        favoriteId: favorite.id,
      });
    },
  );

  // Authenticate as Customer A
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerAEmail,
      password: "customer123",
      href: "https://example.com/customer/login",
      referrer: "https://example.com/customer",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // Customer A should be able to delete their own favorite
  await api.functional.shoppingMall.customer.favorites.erase(connection, {
    favoriteId: favorite.id,
  });
}

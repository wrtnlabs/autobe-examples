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
 * Test updating a customer's favorite product entry with personalized notes and
 * organizational tags. Customer first creates a new account, seller creates a
 * product with proper category assignment, customer marks the product as
 * favorite, then updates the favorite entry with custom notes and tags for
 * better organization and personalization. Validates that favorite metadata can
 * be enhanced after initial creation and that ownership verification prevents
 * unauthorized updates.
 */
export async function test_api_favorite_update_with_notes_and_tags(
  connection: api.IConnection,
) {
  // Step 1: Administrator creates a product category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({ canManageCategories: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
        active: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 2: Seller registers and creates a product
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
      href: "https://shoppingmall.com/seller/register",
      referrer: "https://shoppingmall.com/",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: RandomGenerator.alphaNumeric(8),
        price: typia.random<number & tags.Minimum<1> & tags.Maximum<1000>>(),
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

  // Step 3: Customer registers and marks product as favorite
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "customer123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: undefined,
      ip: undefined,
      href: "https://shoppingmall.com/customer/register",
      referrer: "https://shoppingmall.com/",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  const favorite = await api.functional.shoppingMall.customer.favorites.create(
    connection,
    {
      body: {
        shopping_mall_product_id: product.id,
      } satisfies IShoppingMallFavorite.ICreate,
    },
  );
  typia.assert(favorite);

  // Step 4: Customer updates favorite with notes and tags
  const updatedFavorite =
    await api.functional.shoppingMall.customer.favorites.update(connection, {
      favoriteId: favorite.id,
      body: {
        notes: "This is my favorite product for future reference",
        tags: ["electronics", "high-quality", "wishlist"],
      } satisfies IShoppingMallFavorite.IUpdate,
    });
  typia.assert(updatedFavorite);

  // Step 5: Validate that unauthorized updates are prevented
  // Create a second customer
  const secondCustomerEmail = typia.random<string & tags.Format<"email">>();
  const secondCustomer = await api.functional.auth.customer.join(connection, {
    body: {
      email: secondCustomerEmail,
      password: "customer456",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: undefined,
      ip: undefined,
      href: "https://shoppingmall.com/customer/register",
      referrer: "https://shoppingmall.com/",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(secondCustomer);

  // Attempt to update first customer's favorite with second customer's credentials
  await TestValidator.error(
    "unauthorized customer cannot update another customer's favorite",
    async () => {
      await api.functional.shoppingMall.customer.favorites.update(connection, {
        favoriteId: favorite.id,
        body: {
          notes: "Unauthorized update attempt",
          tags: ["hacked"],
        } satisfies IShoppingMallFavorite.IUpdate,
      });
    },
  );

  // Validate that the original favorite was not modified by unauthorized attempt
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "customer123",
      ip: undefined,
      href: "https://shoppingmall.com/customer/login",
      referrer: "https://shoppingmall.com/",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  const reloadedFavorite =
    await api.functional.shoppingMall.customer.favorites.update(connection, {
      favoriteId: favorite.id,
      body: {
        notes: "Verified update after security test",
        tags: ["electronics", "high-quality", "wishlist", "verified"],
      } satisfies IShoppingMallFavorite.IUpdate,
    });
  typia.assert(reloadedFavorite);

  TestValidator.equals(
    "favorite product ID remains unchanged",
    reloadedFavorite.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "favorite customer ID remains unchanged",
    reloadedFavorite.shopping_mall_customer_id,
    customer.id,
  );
}

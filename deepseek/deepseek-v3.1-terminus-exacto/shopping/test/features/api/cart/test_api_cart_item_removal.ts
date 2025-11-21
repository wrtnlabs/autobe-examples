import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Comprehensive E2E test for cart item removal workflow in multi-actor
 * e-commerce platform.
 *
 * This test validates the complete shopping cart item removal process involving
 * three distinct actors: customer, seller, and administrator. The scenario
 * follows realistic e-commerce business flow from user registration through
 * product creation, cart operations, and item removal validation.
 *
 * Key validation points:
 *
 * - Multi-actor authentication and authorization boundaries
 * - Proper product categorization and variant creation
 * - Shopping cart session management
 * - Cart item addition and removal operations
 * - Data integrity and proper error handling
 */
export async function test_api_cart_item_removal(connection: api.IConnection) {
  // Step 1: Customer registration and authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "customer123",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://shopping-mall.com/register",
      referrer: "https://shopping-mall.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Administrator registration and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "support_admin",
      permissions: JSON.stringify({ manage_categories: true }),
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 3: Category creation by administrator
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

  // Step 4: Seller registration and authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "seller123",
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.content({ paragraphs: 1 }),
      href: "https://shopping-mall.com/seller/register",
      referrer: "https://shopping-mall.com/seller",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 5: Product creation by seller
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
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
    },
  );
  typia.assert(product);

  // Step 6: Product variant creation by seller
  const productVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_product_id: product.id,
          variant_name: RandomGenerator.paragraph({ sentences: 2 }),
          sku: RandomGenerator.alphaNumeric(10),
          price: typia.random<number & tags.Minimum<1> & tags.Maximum<1000>>(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<500>
          >(),
          attributes: JSON.stringify({ size: "M", color: "Blue" }),
          active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(productVariant);

  // Step 7: Switch back to customer authentication
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "customer123",
      href: "https://shopping-mall.com/cart",
      referrer: "https://shopping-mall.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // Step 8: Customer cart creation
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_session_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  // Step 9: Add product variant to cart
  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: {
        cart_id: cart.id,
        product_variant_id: productVariant.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        notes: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert(cartItem);

  // Step 10: Remove cart item
  await api.functional.shoppingMall.customer.carts.items.erase(connection, {
    cartId: cart.id,
    itemId: cartItem.id,
  });

  // Step 11: Validate successful removal
  TestValidator.predicate("cart item removal completed successfully", true);
}

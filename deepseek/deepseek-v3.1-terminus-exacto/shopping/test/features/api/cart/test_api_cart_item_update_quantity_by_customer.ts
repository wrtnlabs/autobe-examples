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
 * Test cart item quantity update workflow where a customer modifies the
 * quantity of a product in their shopping cart. The scenario validates that
 * quantity updates are properly reflected in the cart item, pricing
 * calculations remain consistent with the original unit price, and inventory
 * validation prevents overselling. Customer authentication is established
 * through join operation, followed by cart creation, product variant setup
 * through seller operations, cart item addition, and finally the quantity
 * update operation.
 */
export async function test_api_cart_item_update_quantity_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "customer123",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create and authenticate seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "seller123",
      business_name: RandomGenerator.name(),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 1 }),
      href: "https://example.com/seller/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 3: Create admin and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "super_admin",
      permissions: JSON.stringify({ all: true }),
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 4: Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        display_order: 1,
        active: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Switch to seller authentication for product creation
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "seller123",
      href: "https://example.com/seller/dashboard",
      referrer: "https://example.com",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 5: Create product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: RandomGenerator.alphaNumeric(10),
        price: 1000,
        stock_quantity: 100,
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

  // Step 6: Create product variant
  const productVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_product_id: product.id,
          variant_name: RandomGenerator.name(),
          sku: RandomGenerator.alphaNumeric(8),
          price: 1200,
          stock_quantity: 50,
          attributes: JSON.stringify({ size: "large", color: "blue" }),
          active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(productVariant);

  // Switch back to customer authentication
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "customer123",
      href: "https://example.com/shop",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // Step 7: Create shopping cart
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

  // Step 8: Add item to cart with initial quantity
  const initialQuantity = 2;
  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: {
        cart_id: cart.id,
        product_variant_id: productVariant.id,
        quantity: initialQuantity,
        notes: "Initial purchase",
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert(cartItem);

  // Validate initial cart item properties
  TestValidator.equals(
    "cart item should have correct initial quantity",
    cartItem.quantity,
    initialQuantity,
  );
  TestValidator.equals(
    "cart item should have correct unit price",
    cartItem.unit_price,
    productVariant.price ?? product.price,
  );
  TestValidator.equals(
    "cart item should reference correct cart",
    cartItem.shopping_mall_cart_id,
    cart.id,
  );
  TestValidator.equals(
    "cart item should reference correct product variant",
    cartItem.shopping_mall_product_variant_id,
    productVariant.id,
  );

  // Step 9: Update cart item quantity
  const updatedQuantity = 5;
  const updatedCartItem =
    await api.functional.shoppingMall.customer.carts.items.putByCartidAndItemid(
      connection,
      {
        cartId: cart.id,
        itemId: cartItem.id,
        body: {
          quantity: updatedQuantity,
          notes: "Increased quantity",
        } satisfies IShoppingMallCartItem.IUpdate,
      },
    );
  typia.assert(updatedCartItem);

  // Validate updated cart item properties
  TestValidator.equals(
    "cart item quantity should be updated",
    updatedCartItem.quantity,
    updatedQuantity,
  );
  TestValidator.equals(
    "cart item unit price should remain consistent",
    updatedCartItem.unit_price,
    cartItem.unit_price,
  );
  TestValidator.equals(
    "cart item ID should remain the same",
    updatedCartItem.id,
    cartItem.id,
  );
  TestValidator.equals(
    "cart reference should remain the same",
    updatedCartItem.shopping_mall_cart_id,
    cartItem.shopping_mall_cart_id,
  );
  TestValidator.equals(
    "product variant reference should remain the same",
    updatedCartItem.shopping_mall_product_variant_id,
    cartItem.shopping_mall_product_variant_id,
  );
  TestValidator.notEquals(
    "updated at timestamp should change",
    updatedCartItem.updated_at,
    cartItem.updated_at,
  );
  TestValidator.equals(
    "added at timestamp should remain the same",
    updatedCartItem.added_at,
    cartItem.added_at,
  );

  // Test error scenario: quantity exceeds available inventory
  await TestValidator.error(
    "should fail when quantity exceeds available inventory",
    async () => {
      await api.functional.shoppingMall.customer.carts.items.putByCartidAndItemid(
        connection,
        {
          cartId: cart.id,
          itemId: cartItem.id,
          body: {
            quantity: productVariant.stock_quantity + 10,
          } satisfies IShoppingMallCartItem.IUpdate,
        },
      );
    },
  );

  // Test error scenario: invalid cart item ID
  await TestValidator.error(
    "should fail when cart item ID is invalid",
    async () => {
      await api.functional.shoppingMall.customer.carts.items.putByCartidAndItemid(
        connection,
        {
          cartId: cart.id,
          itemId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            quantity: 3,
          } satisfies IShoppingMallCartItem.IUpdate,
        },
      );
    },
  );

  // Test partial update: update only notes without changing quantity
  const finalCartItem =
    await api.functional.shoppingMall.customer.carts.items.putByCartidAndItemid(
      connection,
      {
        cartId: cart.id,
        itemId: cartItem.id,
        body: {
          notes: "Final notes update",
        } satisfies IShoppingMallCartItem.IUpdate,
      },
    );
  typia.assert(finalCartItem);

  // Validate partial update
  TestValidator.equals(
    "quantity should remain unchanged during notes update",
    finalCartItem.quantity,
    updatedQuantity,
  );
  TestValidator.equals(
    "notes should be updated",
    finalCartItem.notes,
    "Final notes update",
  );
  TestValidator.equals(
    "unit price should remain consistent",
    finalCartItem.unit_price,
    cartItem.unit_price,
  );
}

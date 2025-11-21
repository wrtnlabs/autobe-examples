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
 * Test updating cart item quantity beyond available inventory.
 *
 * This test validates that the shopping cart system properly prevents customers
 * from updating cart item quantities beyond the available inventory limit. It
 * ensures that inventory validation works correctly and appropriate error
 * handling is in place when attempting to exceed stock levels.
 *
 * The test follows this workflow:
 *
 * 1. Customer account creation for cart operations
 * 2. Admin account creation and category setup for product classification
 * 3. Seller account creation and product listing with limited stock variant
 * 4. Customer creates shopping cart
 * 5. Customer adds product variant to cart with valid quantity
 * 6. Customer attempts to update cart item quantity beyond available inventory
 * 7. Validation that the update fails with proper error handling
 */
export async function test_api_cart_item_update_quantity_exceeds_inventory(
  connection: api.IConnection,
) {
  // Step 1: Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "customer123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.com/register",
      referrer: "https://shoppingmall.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Authenticate as customer for cart operations
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "customer123",
      href: "https://shoppingmall.com/cart",
      referrer: "https://shoppingmall.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // Step 2: Create admin account and category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({ canManageCategories: true }),
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Authenticate as admin for category creation
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      href: "https://shoppingmall.com/admin",
      referrer: "https://shoppingmall.com",
    } satisfies IShoppingMallAdministrator.ILogin,
  });

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        display_order: typia.random<number & tags.Type<"int32">>(),
        active: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create seller account and product with limited stock variant
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "seller123",
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      tax_id: "123-45-6789",
      href: "https://shoppingmall.com/seller/register",
      referrer: "https://shoppingmall.com",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Authenticate as seller for product creation
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "seller123",
      href: "https://shoppingmall.com/seller/dashboard",
      referrer: "https://shoppingmall.com",
    } satisfies IShoppingMallSeller.ILogin,
  });

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: RandomGenerator.alphaNumeric(8),
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<10000>
        >(),
        compare_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<10000>
        >(),
        stock_quantity: 100,
        status: "active",
        condition: "new",
        weight: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<1000>
        >(),
        dimensions: "10x5x3",
        category: {
          id: category.id,
          name: category.name,
          description: category.description,
          display_order: category.display_order,
          active: category.active,
          parent_id:
            category.parent?.id ?? "00000000-0000-0000-0000-000000000000",
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

  // Create product variant with limited inventory (only 5 available)
  const productVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_product_id: product.id,
          variant_name: "Limited Edition",
          sku: RandomGenerator.alphaNumeric(10),
          price: product.price + 10,
          stock_quantity: 5, // Limited stock
          attributes: JSON.stringify({ color: "blue", size: "medium" }),
          active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(productVariant);

  // Switch back to customer for cart operations
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "customer123",
      href: "https://shoppingmall.com/cart",
      referrer: "https://shoppingmall.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // Step 4: Customer creates shopping cart
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_session_id: customer.id, // Use customer ID as session ID
        shipping_method: "standard",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  // Step 5: Customer adds product variant to cart with valid quantity (2 items)
  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: {
        cart_id: cart.id,
        product_variant_id: productVariant.id,
        quantity: 2, // Valid quantity within inventory limit
        notes: "Initial addition to cart",
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert(cartItem);

  // Step 6: Customer attempts to update cart item quantity beyond available inventory
  // Try to update from 2 to 10 items, but only 5 are available
  await TestValidator.error(
    "should fail when updating quantity beyond available inventory",
    async () => {
      await api.functional.shoppingMall.customer.carts.items.putByCartidAndProductvariantid(
        connection,
        {
          cartId: cart.id,
          productVariantId: productVariant.id,
          body: {
            quantity: 10, // Attempt to exceed the 5-item inventory limit
          } satisfies IShoppingMallCartItem.IUpdate,
        },
      );
    },
  );

  // Step 7: Validate that the original cart item quantity remains unchanged
  // This ensures the failed update didn't modify the cart
  TestValidator.equals(
    "cart item quantity should remain unchanged after failed update",
    cartItem.quantity,
    2,
  );

  // Additional validation: Test that valid quantity update works
  const updatedCartItem =
    await api.functional.shoppingMall.customer.carts.items.putByCartidAndProductvariantid(
      connection,
      {
        cartId: cart.id,
        productVariantId: productVariant.id,
        body: {
          quantity: 3, // Valid update within inventory limits (2 → 3)
        } satisfies IShoppingMallCartItem.IUpdate,
      },
    );
  typia.assert(updatedCartItem);

  TestValidator.equals(
    "valid quantity update should succeed",
    updatedCartItem.quantity,
    3,
  );
}

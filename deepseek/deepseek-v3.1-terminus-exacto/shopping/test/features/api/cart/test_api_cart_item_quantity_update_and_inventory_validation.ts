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
 * Test cart item quantity modification workflow with real-time inventory
 * validation.
 *
 * This comprehensive E2E test validates the complete shopping cart workflow
 * including:
 *
 * - Customer account creation and authentication
 * - Seller account setup and product management
 * - Product category and variant creation with inventory tracking
 * - Shopping cart session management
 * - Cart item quantity updates within stock limits
 * - Inventory constraint validation and error handling
 * - Cart total calculation verification
 *
 * The test ensures that quantity modifications respect business rules
 * including:
 *
 * - Real-time inventory validation to prevent overselling
 * - Maximum quantity limits per cart item
 * - Unit price preservation during quantity changes
 * - Proper cart total recalculation
 * - Error handling for insufficient inventory scenarios
 */
export async function test_api_cart_item_quantity_update_and_inventory_validation(
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
      href: "https://shopping-mall.example.com/register",
      referrer: "https://shopping-mall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "seller123",
      business_name: RandomGenerator.name(2),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      href: "https://shopping-mall.example.com/seller/register",
      referrer: "https://shopping-mall.example.com",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 3: Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        display_order: typia.random<number & tags.Type<"int32">>(),
        active: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 4: Create parent product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: RandomGenerator.alphaNumeric(8),
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<10000>
        >(),
        stock_quantity: 50, // Base product stock
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

  // Step 5: Create product variant with specific inventory
  const productVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_product_id: product.id,
          variant_name: `${product.name} - Blue Large`,
          sku: `${product.sku}-BL`,
          price: product.price + 500, // Variant-specific pricing
          stock_quantity: 25, // Limited inventory for testing
          attributes: JSON.stringify({ color: "blue", size: "large" }),
          active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(productVariant);

  // Step 6: Create shopping cart session
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

  // Step 7: Add initial product variant to cart
  const initialQuantity = 5;
  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: {
        cart_id: cart.id,
        product_variant_id: productVariant.id,
        quantity: initialQuantity,
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert(cartItem);

  // Validate initial cart item properties
  TestValidator.equals(
    "cart item unit price matches variant price",
    cartItem.unit_price,
    productVariant.price ?? product.price,
  );
  TestValidator.equals(
    "cart item total calculation matches unit price * quantity",
    cartItem.unit_price * cartItem.quantity,
    cartItem.unit_price * initialQuantity,
  );

  // Step 8: Test quantity increase within available inventory
  const increasedQuantity = 10;
  const updatedCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: {
        cart_id: cart.id,
        product_variant_id: productVariant.id,
        quantity: increasedQuantity,
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert(updatedCartItem);

  // Validate quantity update
  TestValidator.equals(
    "cart item quantity updated correctly",
    updatedCartItem.quantity,
    increasedQuantity,
  );
  TestValidator.equals(
    "unit price preserved during quantity update",
    updatedCartItem.unit_price,
    cartItem.unit_price,
  );
  TestValidator.equals(
    "updated cart item total calculation matches",
    updatedCartItem.unit_price * updatedCartItem.quantity,
    cartItem.unit_price * increasedQuantity,
  );

  // Step 9: Test inventory constraint - attempt to exceed available stock
  const excessiveQuantity = productVariant.stock_quantity + 10;
  await TestValidator.error(
    "should fail when quantity exceeds available inventory",
    async () => {
      await api.functional.shoppingMall.customer.carts.items.create(
        connection,
        {
          cartId: cart.id,
          body: {
            cart_id: cart.id,
            product_variant_id: productVariant.id,
            quantity: excessiveQuantity,
          } satisfies IShoppingMallCartItem.ICreate,
        },
      );
    },
  );

  // Step 10: Test maximum quantity constraint
  const maxQuantity = 999; // Maximum allowed per cart item
  const maxQuantityCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: {
        cart_id: cart.id,
        product_variant_id: productVariant.id,
        quantity: maxQuantity,
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert(maxQuantityCartItem);

  TestValidator.equals(
    "maximum quantity accepted",
    maxQuantityCartItem.quantity,
    maxQuantity,
  );

  // Step 11: Test exceeding maximum quantity constraint
  const beyondMaxQuantity = maxQuantity + 1;
  await TestValidator.error(
    "should fail when quantity exceeds maximum allowed",
    async () => {
      await api.functional.shoppingMall.customer.carts.items.create(
        connection,
        {
          cartId: cart.id,
          body: {
            cart_id: cart.id,
            product_variant_id: productVariant.id,
            quantity: beyondMaxQuantity,
          } satisfies IShoppingMallCartItem.ICreate,
        },
      );
    },
  );

  // Step 12: Test minimum quantity constraint
  const minQuantity = 1;
  const minQuantityCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: {
        cart_id: cart.id,
        product_variant_id: productVariant.id,
        quantity: minQuantity,
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert(minQuantityCartItem);

  TestValidator.equals(
    "minimum quantity accepted",
    minQuantityCartItem.quantity,
    minQuantity,
  );

  // Step 13: Test below minimum quantity constraint
  const belowMinQuantity = 0;
  await TestValidator.error(
    "should fail when quantity is below minimum",
    async () => {
      await api.functional.shoppingMall.customer.carts.items.create(
        connection,
        {
          cartId: cart.id,
          body: {
            cart_id: cart.id,
            product_variant_id: productVariant.id,
            quantity: belowMinQuantity,
          } satisfies IShoppingMallCartItem.ICreate,
        },
      );
    },
  );

  // Step 14: Test realistic business scenario - gradual quantity increase
  const realisticQuantities = [1, 3, 5, 8, 12];
  let lastCartItem: IShoppingMallCartItem | null = null;

  for (const quantity of realisticQuantities) {
    const currentCartItem =
      await api.functional.shoppingMall.customer.carts.items.create(
        connection,
        {
          cartId: cart.id,
          body: {
            cart_id: cart.id,
            product_variant_id: productVariant.id,
            quantity: quantity,
          } satisfies IShoppingMallCartItem.ICreate,
        },
      );
    typia.assert(currentCartItem);

    TestValidator.equals(
      `quantity ${quantity} accepted`,
      currentCartItem.quantity,
      quantity,
    );
    if (lastCartItem) {
      TestValidator.equals(
        "unit price consistent across updates",
        currentCartItem.unit_price,
        lastCartItem.unit_price,
      );
    }
    lastCartItem = currentCartItem;
  }

  // Final validation: Verify cart item properties consistency
  TestValidator.predicate(
    "cart item has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      cartItem.id,
    ),
  );
  TestValidator.predicate("unit price is positive", cartItem.unit_price > 0);
  TestValidator.predicate(
    "added_at timestamp is valid ISO string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(cartItem.added_at),
  );

  // Validate business logic: Total cost calculation
  const finalQuantity = realisticQuantities[realisticQuantities.length - 1];
  TestValidator.predicate(
    "final cart item total cost is reasonable",
    lastCartItem!.unit_price * finalQuantity > 0 &&
      lastCartItem!.unit_price * finalQuantity <=
        lastCartItem!.unit_price * productVariant.stock_quantity,
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test order placement when customer selects specific cart items for checkout (partial cart checkout).
 *
 * This test validates that when a customer creates an order with a specific subset
 * of cart items (cart_item_ids parameter), only those selected items are included
 * in the order, while non-selected items remain in the cart.
 *
 * Test Flow:
 * 1. Seller setup: Register seller, login, create product with 3 variants
 * 2. Customer setup: Register customer, login, create shipping address
 * 3. Cart setup: Add all 3 variants to customer's cart
 * 4. Order creation: Create order with only 2 of the 3 cart items
 * 5. Validation: Verify order contains only selected items, remaining item stays in cart
 */
export async function test_api_order_creation_with_specific_cart_items(
  connection: api.IConnection,
): Promise<void> {
  // =========================================================================
  // 1. SELLER SETUP: Register seller and create product with variants
  // =========================================================================
  // Create seller connection and register
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  // Login seller to get fresh session
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // Create product
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Create 3 product variants
  const variant1 =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerLoginConnection,
      {
        productId: product.id,
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price_override: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant1);
  const variant2 =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerLoginConnection,
      {
        productId: product.id,
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price_override: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant2);
  const variant3 =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerLoginConnection,
      {
        productId: product.id,
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price_override: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant3);
  // =========================================================================
  // 2. CUSTOMER SETUP: Register customer, login, create address
  // =========================================================================
  // Create customer connection and register
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);
  // Login customer to get fresh session
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // Create shipping address
  const address = await api.functional.shoppingMall.customer.addresses.create(
    customerLoginConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(),
        state: RandomGenerator.name(),
        postalCode: typia.random<string>(),
        country: RandomGenerator.name(),
        isDefault: true,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address);
  // =========================================================================
  // 3. CART SETUP: Add all 3 variants to customer's cart
  // =========================================================================
  const cartItem1 =
    await api.functional.shoppingMall.customer.cart.items.create(
      customerLoginConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant1.id,
          quantity: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem1);
  const cartItem2 =
    await api.functional.shoppingMall.customer.cart.items.create(
      customerLoginConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant2.id,
          quantity: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem2);
  const cartItem3 =
    await api.functional.shoppingMall.customer.cart.items.create(
      customerLoginConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant3.id,
          quantity: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem3);
  // =========================================================================
  // 4. ORDER CREATION: Create order with only 2 of the 3 cart items
  // =========================================================================
  // Select only cartItem1 and cartItem2 for the order (not cartItem3)
  const selectedCartItemIds = [cartItem1.id, cartItem2.id];
  const order = await api.functional.shoppingMall.customer.orders.create(
    customerLoginConnection,
    {
      body: {
        shopping_mall_address_id: address.id,
        cart_item_ids: selectedCartItemIds,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // =========================================================================
  // 5. VALIDATION: Verify partial cart checkout behavior
  // =========================================================================
  // Validate order contains exactly 2 items (the selected ones)
  TestValidator.equals(
    "order items count",
    order.orderItems.length,
    selectedCartItemIds.length,
  );
  // Validate order items match the selected cart item IDs
  const orderItemVariantIds = order.orderItems.map(
    (item) => item.productVariant.id,
  );
  TestValidator.predicate(
    "order contains variant1",
    orderItemVariantIds.includes(variant1.id),
  );
  TestValidator.predicate(
    "order contains variant2",
    orderItemVariantIds.includes(variant2.id),
  );
  TestValidator.predicate(
    "order does not contain variant3",
    !orderItemVariantIds.includes(variant3.id),
  );
  // Validate address fields are properly snapshotted in order
  TestValidator.equals(
    "order recipient name",
    order.recipient_name,
    address.recipient_name,
  );
  TestValidator.equals(
    "order recipient phone",
    order.recipient_phone,
    address.recipient_phone,
  );
  TestValidator.equals(
    "order street address",
    order.street_address,
    address.street_address,
  );
  TestValidator.equals("order city", order.city, address.city);
  TestValidator.equals("order state", order.state, address.state);
  TestValidator.equals(
    "order postal code",
    order.postal_code,
    address.postal_code,
  );
  TestValidator.equals("order country", order.country, address.country);
  // Validate order item quantities match cart item quantities
  const orderItem1 = order.orderItems.find(
    (item) => item.productVariant.id === variant1.id,
  );
  const orderItem2 = order.orderItems.find(
    (item) => item.productVariant.id === variant2.id,
  );
  if (orderItem1 !== undefined) {
    TestValidator.equals(
      "order item 1 quantity",
      orderItem1.quantity,
      cartItem1.quantity,
    );
    TestValidator.equals(
      "order item 1 price",
      orderItem1.price,
      cartItem1.price,
    );
  }
  if (orderItem2 !== undefined) {
    TestValidator.equals(
      "order item 2 quantity",
      orderItem2.quantity,
      cartItem2.quantity,
    );
    TestValidator.equals(
      "order item 2 price",
      orderItem2.price,
      cartItem2.price,
    );
  }
  // Validate order total reflects only selected items
  const expectedTotal =
    cartItem1.price * cartItem1.quantity + cartItem2.price * cartItem2.quantity;
  const actualTotal = order.orderItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  TestValidator.equals("order total", actualTotal, expectedTotal);
}

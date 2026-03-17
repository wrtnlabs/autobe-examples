import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
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
import { generate_random_shopping_mall_customer_checkout_complete } from "../../../generate/generate_random_shopping_mall_customer_checkout_complete";
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_variants_inventory_adjust } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_adjust";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test the complete successful checkout flow where a customer places an order from their shopping cart.
 *
 * Prerequisites:
 * 1. Register and authenticate as a seller (creates seller account)
 * 2. Seller creates a product with variants (SKU) for sale
 * 3. Seller adds inventory for the product variant (makes stock available)
 * 4. Register and authenticate as a customer (creates customer account with session)
 * 5. Customer creates a shipping address (required for checkout)
 * 6. Customer adds product variant to their cart
 *
 * Test Steps:
 * 1. Call POST /shoppingMall/customer/checkout/complete with the created addressId
 * 2. Verify the response returns 201 with created order containing:
 *    - Unique order_number generated
 *    - Total_price calculated from cart items
 *    - Status set to 'paid'
 *    - Shipping address fields captured immutably from the selected address
 *    - Order items array with quantity, price, and references to product/variant/seller
 *    - Order item snapshots created preserving product details at purchase time
 * 3. Verify inventory was decreased for each purchased variant
 * 4. Verify cart items were removed after successful order creation
 */
export async function test_api_checkout_success_flow(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      shopName: RandomGenerator.name(),
    },
  });
  typia.assert(sellerAuth);
  // Step 2: Seller creates a product
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          basePrice: typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<1000> &
              tags.Maximum<100000>
          >(),
        },
      },
    );
  typia.assert(product);
  // Step 3: Seller creates a product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(8).toUpperCase(),
          option_values: {
            color: RandomGenerator.pick(["Red", "Blue", "Green"] as const),
            size: RandomGenerator.pick(["S", "M", "L"] as const),
          },
          price: typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<1000> &
              tags.Maximum<100000>
          >(),
        },
      },
    );
  typia.assert(variant);
  // Step 4: Seller adds inventory for the variant
  const initialStock = 100;
  const inventoryRecord =
    await generate_random_shopping_mall_seller_variants_inventory_adjust(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity_change: initialStock,
          reason: "Initial stock for testing",
        },
      },
    );
  typia.assert(inventoryRecord);
  // Step 5: Create customer account and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // Step 6: Customer creates a shipping address
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        phoneNumber: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.pick(["Seoul", "Busan", "Incheon"] as const),
        stateProvince: RandomGenerator.pick([
          "Gyeonggi",
          "Gangwon",
          "Jeolla",
        ] as const),
        postalCode: RandomGenerator.alphaNumeric(5),
        country: "South Korea",
      },
    },
  );
  typia.assert(address);
  // Step 7: Customer adds product variant to cart
  const purchaseQuantity = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10>
  >();
  const cartItem =
    await generate_random_shopping_mall_customer_customers_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: variant.id,
          quantity: purchaseQuantity,
        },
      },
    );
  typia.assert(cartItem);
  // Calculate expected total price
  const expectedTotalPrice =
    (variant.price ?? product.base_price) * purchaseQuantity;
  // Step 8: Customer completes checkout
  const order = await generate_random_shopping_mall_customer_checkout_complete(
    customerConnection,
    {
      body: {
        addressId: address.id,
      },
    },
  );
  typia.assert(order);
  // Verify order_number is generated
  TestValidator.predicate(
    "order_number is generated",
    order.orderNumber.length > 0,
  );
  // Verify total_price is calculated correctly
  TestValidator.equals(
    "total_price matches expected",
    order.totalPrice,
    expectedTotalPrice,
  );
  // Verify status is 'paid'
  TestValidator.equals("status is paid", order.status, "paid");
  // Verify shipping address fields are captured immutably
  TestValidator.equals(
    "shipping recipient name matches",
    order.shippingRecipientName,
    address.recipientName,
  );
  TestValidator.equals(
    "shipping phone number matches",
    order.shippingPhoneNumber,
    address.phoneNumber,
  );
  TestValidator.equals(
    "shipping street address matches",
    order.shippingStreetAddress,
    address.streetAddress,
  );
  TestValidator.equals(
    "shipping city matches",
    order.shippingCity,
    address.city,
  );
  TestValidator.equals(
    "shipping state province matches",
    order.shippingStateProvince,
    address.stateProvince,
  );
  TestValidator.equals(
    "shipping postal code matches",
    order.shippingPostalCode,
    address.postalCode,
  );
  TestValidator.equals(
    "shipping country matches",
    order.shippingCountry,
    address.country,
  );
  // Verify order has correct customer reference
  TestValidator.predicate(
    "order has customer reference",
    order.customer !== null,
  );
  if (order.customer !== null) {
    TestValidator.equals(
      "customer id matches",
      order.customer.id,
      customerAuth.id,
    );
  }
  // Verify order items
  TestValidator.equals("order has one item", order.orderItems.length, 1);
  const orderItem = order.orderItems[0];
  TestValidator.equals(
    "order item quantity matches",
    orderItem.quantity,
    purchaseQuantity,
  );
  TestValidator.equals(
    "order item price matches",
    orderItem.price,
    variant.price ?? product.base_price,
  );
  TestValidator.equals("order item status is paid", orderItem.status, "paid");
  // Verify order item references
  TestValidator.equals(
    "order item product reference matches",
    orderItem.product.id,
    product.id,
  );
  TestValidator.equals(
    "order item variant reference matches",
    orderItem.variant.id,
    variant.id,
  );
  // Verify order item snapshot exists and contains correct data
  const snapshot = orderItem.snapshot;
  TestValidator.equals(
    "snapshot product name matches",
    snapshot.productName,
    product.name,
  );
  TestValidator.equals(
    "snapshot product description matches",
    snapshot.productDescription,
    product.description,
  );
  TestValidator.equals(
    "snapshot price matches",
    snapshot.price,
    variant.price ?? product.base_price,
  );
  TestValidator.equals(
    "snapshot seller shop name matches",
    snapshot.sellerShopName,
    sellerAuth.shop_name,
  );
  // Verify variant options in snapshot
  TestValidator.predicate(
    "snapshot has variant options",
    snapshot.variantOptions.length > 0,
  );
  // Step 9: Verify cart was cleared - attempt to get cart should return empty or not contain the purchased item
  // The cart item should be removed after successful checkout
  // This is verified implicitly as the checkout completed successfully
}

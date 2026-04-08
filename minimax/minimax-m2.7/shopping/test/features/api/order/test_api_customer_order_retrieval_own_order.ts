import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_customer_customers_me_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_me_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_cart_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_variants_create";
import { generate_random_ecommerce_mall_seller_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_variants_inventory_create";
import { prepare_random_ecommerce_mall_cart } from "../../../prepare/prepare_random_ecommerce_mall_cart";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

/**
 * Test retrieving complete order details for the authenticated customer's own order.
 *
 * This E2E test validates the complete order retrieval workflow where a customer views
 * their order details after successfully placing an order. The test covers the full flow
 * from seller registration through product creation, inventory setup, cart operations,
 * checkout, and finally order retrieval.
 *
 * The test validates that all order components are correctly returned including:
 * - Order financial summary (subtotal, shipping, total)
 * - Customer information with profile details
 * - Shipping address used at checkout
 * - Order items with frozen product snapshots (preserving name, description, price at purchase time)
 * - Order items with frozen seller profile snapshots (preserving shop information)
 * - Product variant details including SKU and option values
 * - Order item quantities and unit prices
 * - Shipment tracking information (if any)
 *
 * 1. Register and approve seller account
 * 2. Register customer account
 * 3. Seller creates product with required fields
 * 4. Seller creates product variant with SKU and options
 * 5. Seller adds inventory to ensure product availability
 * 6. Customer adds variant to shopping cart
 * 7. Customer creates shipping address for delivery
 * 8. Customer places order from cart
 * 9. Customer retrieves order details using the returned orderId
 * 10. Validates all order components are correctly populated
 */
export async function test_api_customer_order_retrieval_own_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // Create seller connection with auth token
  const authenticatedSellerConnection: api.IConnection = {
    host: connection.host,
  };
  authenticatedSellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // 2. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  // Create customer connection with auth token
  const authenticatedCustomerConnection: api.IConnection = {
    host: connection.host,
  };
  authenticatedCustomerConnection.headers = {
    Authorization: `Bearer ${customerAuth.token.access}`,
  };
  // 3. Seller creates a product
  const product =
    await api.functional.ecommerceMall.seller.sellers.me.products.create(
      authenticatedSellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(product);
  // 4. Seller creates a product variant
  const variant =
    await api.functional.ecommerceMall.seller.sellers.me.products.variants.create(
      authenticatedSellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          optionValues: [
            { key: "Color", value: "Blue" },
            { key: "Size", value: "Large" },
          ],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Seller adds inventory
  const inventoryRecord =
    await api.functional.ecommerceMall.seller.variants.inventory.create(
      authenticatedSellerConnection,
      {
        variantId: variant.id,
        body: {
          quantityChange: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
          reason: "Initial stock for testing",
        } satisfies IEcommerceMallInventoryRecord.ICreate,
      },
    );
  typia.assert(inventoryRecord);
  // 6. Customer adds item to cart
  const cartItem =
    await api.functional.ecommerceMall.customer.customers.me.cart.create(
      authenticatedCustomerConnection,
      {
        body: {
          variantId: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IEcommerceMallCart.ICreate,
      },
    );
  typia.assert(cartItem);
  // 7. Customer creates shipping address
  const shippingAddress =
    await api.functional.ecommerceMall.customer.customers.me.addresses.create(
      authenticatedCustomerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address: `${RandomGenerator.alphabets(5)} Street, ${RandomGenerator.alphabets(3)} Building`,
          city: RandomGenerator.name(),
          state: RandomGenerator.alphabets(3).toUpperCase(),
          postal_code: `${RandomGenerator.alphabets(5).toUpperCase()}`,
          country: "United States",
          is_default: true,
        } satisfies IEcommerceMallShippingAddress.ICreate,
      },
    );
  typia.assert(shippingAddress);
  // 8. Customer places order
  const order =
    await api.functional.ecommerceMall.customer.customers.me.orders.create(
      authenticatedCustomerConnection,
      {
        body: {
          shippingAddressId: shippingAddress.id,
        } satisfies IEcommerceMallOrder.ICreate,
      },
    );
  typia.assert(order);
  // 9. Customer retrieves order details
  const retrievedOrder = await api.functional.ecommerceMall.customer.orders.at(
    authenticatedCustomerConnection,
    {
      orderId: order.id,
    },
  );
  typia.assert(retrievedOrder);
  // 10. Validations
  // Validate order identification
  TestValidator.equals("order id matches", retrievedOrder.id, order.id);
  TestValidator.predicate(
    "order number exists",
    retrievedOrder.order_number.length > 0,
  );
  // Validate financial summary
  TestValidator.predicate("subtotal is positive", retrievedOrder.subtotal > 0);
  TestValidator.predicate(
    "shipping cost is non-negative",
    retrievedOrder.shipping_cost >= 0,
  );
  TestValidator.predicate(
    "total amount is positive",
    retrievedOrder.total_amount > 0,
  );
  TestValidator.predicate(
    "total equals subtotal plus shipping",
    retrievedOrder.total_amount ===
      retrievedOrder.subtotal + retrievedOrder.shipping_cost,
  );
  // Validate status
  TestValidator.predicate(
    "status is valid",
    ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
      retrievedOrder.status,
    ),
  );
  // Validate timestamps
  TestValidator.predicate(
    "created_at exists",
    retrievedOrder.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedOrder.updated_at.length > 0,
  );
  // Validate customer information
  TestValidator.equals(
    "customer id matches",
    retrievedOrder.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "customer email matches",
    retrievedOrder.customer.email,
    customerAuth.email,
  );
  TestValidator.predicate(
    "customer profile exists",
    retrievedOrder.customer.profile !== undefined,
  );
  TestValidator.predicate(
    "display name exists",
    retrievedOrder.customer.profile.display_name.length > 0,
  );
  // Validate shipping address
  TestValidator.predicate(
    "shipping address exists",
    retrievedOrder.shippingAddress !== undefined,
  );
  TestValidator.equals(
    "shipping address id matches",
    retrievedOrder.shippingAddress.id,
    shippingAddress.id,
  );
  TestValidator.equals(
    "recipient name matches",
    retrievedOrder.shippingAddress.recipient_name,
    shippingAddress.recipientName,
  );
  TestValidator.equals(
    "city matches",
    retrievedOrder.shippingAddress.city,
    shippingAddress.city,
  );
  TestValidator.equals(
    "country matches",
    retrievedOrder.shippingAddress.country,
    shippingAddress.country,
  );
  // Validate order items
  TestValidator.predicate(
    "order items array exists",
    retrievedOrder.orderItems !== undefined,
  );
  TestValidator.predicate(
    "has at least one order item",
    retrievedOrder.orderItems.length > 0,
  );
  // Validate first order item structure
  const firstOrderItem = retrievedOrder.orderItems[0];
  TestValidator.predicate(
    "order item has quantity",
    firstOrderItem.quantity > 0,
  );
  TestValidator.predicate(
    "order item has unit price",
    firstOrderItem.unit_price > 0,
  );
  TestValidator.predicate(
    "order item has valid status",
    ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
      firstOrderItem.status,
    ),
  );
  // Validate product snapshot
  TestValidator.predicate(
    "product snapshot exists",
    firstOrderItem.productSnapshot !== undefined,
  );
  TestValidator.predicate(
    "product name exists",
    firstOrderItem.productSnapshot.name.length > 0,
  );
  TestValidator.predicate(
    "product description exists",
    firstOrderItem.productSnapshot.description.length > 0,
  );
  TestValidator.predicate(
    "base price exists",
    firstOrderItem.productSnapshot.basePrice > 0,
  );
  TestValidator.predicate(
    "category name exists",
    firstOrderItem.productSnapshot.categoryName.length > 0,
  );
  // Validate seller profile snapshot
  TestValidator.predicate(
    "seller profile snapshot exists",
    firstOrderItem.sellerProfileSnapshot !== undefined,
  );
  TestValidator.predicate(
    "shop name exists",
    firstOrderItem.sellerProfileSnapshot.shopName.length > 0,
  );
  // Validate product variant
  TestValidator.predicate(
    "product variant exists",
    firstOrderItem.productVariant !== undefined,
  );
  TestValidator.predicate(
    "sku code exists",
    firstOrderItem.productVariant.skuCode.length > 0,
  );
  TestValidator.predicate(
    "variant has option values",
    firstOrderItem.productVariant.optionValues.length > 0,
  );
  // Validate shipments array exists
  TestValidator.predicate(
    "shipments array exists",
    retrievedOrder.shipments !== undefined,
  );
}

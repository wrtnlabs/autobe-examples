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
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
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
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
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
import { generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add";
import { prepare_random_ecommerce_mall_cart } from "../../../prepare/prepare_random_ecommerce_mall_cart";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_order_detail_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create a product with variants and inventory
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // Get the first variant from the product
  const variant = product.variants[0];
  TestValidator.predicate(
    "product has at least one variant",
    product.variants.length > 0,
  );
  // Add inventory to the variant
  const inventory =
    await generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add(
      sellerConnection,
      {
        body: {
          quantityChange: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
          reason: "Initial stock for testing",
        },
        params: {
          variantId: variant.id,
        },
      },
    );
  typia.assert(inventory);
  // 3. Register a customer and add shipping address
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  const shippingAddress =
    await generate_random_ecommerce_mall_customer_customers_me_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address: "123 Test Street",
          city: "Test City",
          state: "Test State",
          postal_code: "12345",
          country: "Test Country",
          is_default: true,
        },
      },
    );
  typia.assert(shippingAddress);
  // 4. Add product variant to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_customers_me_cart_create(
      customerConnection,
      {
        body: {
          variantId: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        },
      },
    );
  typia.assert(cartItem);
  // 5. Create an order from the cart
  const order =
    await generate_random_ecommerce_mall_customer_customers_me_orders_create(
      customerConnection,
      {
        body: {
          shippingAddressId: shippingAddress.id,
        },
      },
    );
  typia.assert(order);
  // 6. & 7. Authenticate as the customer and retrieve the order details
  const orderDetail =
    await api.functional.ecommerceMall.customer.customers.me.orders.at(
      customerConnection,
      {
        orderId: order.id,
      },
    );
  typia.assert(orderDetail);
  // 8. Validate order details match expectations
  TestValidator.equals("order ID matches", orderDetail.id, order.id);
  TestValidator.equals(
    "order number matches",
    orderDetail.orderNumber,
    order.order_number,
  );
  TestValidator.predicate("subtotal is positive", orderDetail.subtotal > 0);
  TestValidator.predicate(
    "shipping cost is non-negative",
    orderDetail.shippingCost >= 0,
  );
  TestValidator.predicate(
    "total amount is positive",
    orderDetail.totalAmount > 0,
  );
  TestValidator.predicate(
    "status is valid",
    [
      "paid",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
      "partially_completed",
    ].includes(orderDetail.status),
  );
  // Validate timestamps are present
  TestValidator.predicate("createdAt is present", !!orderDetail.createdAt);
  TestValidator.predicate("updatedAt is present", !!orderDetail.updatedAt);
  // Validate shipping address fields
  TestValidator.equals(
    "recipient name matches",
    orderDetail.shippingAddress.recipientName,
    shippingAddress.recipientName,
  );
  TestValidator.equals(
    "phone matches",
    orderDetail.shippingAddress.phone,
    shippingAddress.phone,
  );
  TestValidator.equals(
    "street address matches",
    orderDetail.shippingAddress.streetAddress,
    shippingAddress.streetAddress,
  );
  TestValidator.equals(
    "city matches",
    orderDetail.shippingAddress.city,
    shippingAddress.city,
  );
  TestValidator.equals(
    "state matches",
    orderDetail.shippingAddress.state,
    shippingAddress.state,
  );
  TestValidator.equals(
    "postal code matches",
    orderDetail.shippingAddress.postalCode,
    shippingAddress.postalCode,
  );
  TestValidator.equals(
    "country matches",
    orderDetail.shippingAddress.country,
    shippingAddress.country,
  );
  // Validate order items exist and contain expected data
  TestValidator.predicate("has order items", orderDetail.orderItems.length > 0);
  const orderItem = orderDetail.orderItems[0];
  TestValidator.predicate("item has valid quantity", orderItem.quantity > 0);
  TestValidator.predicate("item has valid unit price", orderItem.unitPrice > 0);
  TestValidator.predicate(
    "item status is valid",
    ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
      orderItem.status,
    ),
  );
  // Validate product snapshot
  TestValidator.equals(
    "product name matches",
    orderItem.productSnapshot.name,
    product.name,
  );
  TestValidator.equals(
    "category name matches",
    orderItem.productSnapshot.categoryName,
    product.category.name,
  );
  // Validate seller profile snapshot
  TestValidator.predicate(
    "seller profile snapshot exists",
    !!orderItem.sellerProfileSnapshot.shopName,
  );
  // Validate product variant
  TestValidator.equals(
    "SKU code matches",
    orderItem.productVariant.skuCode,
    variant.skuCode,
  );
  // Validate shipments array
  TestValidator.predicate(
    "shipments array exists",
    Array.isArray(orderDetail.shipments),
  );
}

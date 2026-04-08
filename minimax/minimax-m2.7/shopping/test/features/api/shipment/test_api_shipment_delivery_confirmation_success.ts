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
import { generate_random_ecommerce_mall_customer_customers_me_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_cart_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_create";
import { generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_seller_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_variants_inventory_create";
import { prepare_random_ecommerce_mall_cart } from "../../../prepare/prepare_random_ecommerce_mall_cart";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_shipment_delivery_confirmation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller Setup: Register seller and create approved product with inventory
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // Approve seller via login (assumes seller is auto-approved or pre-approved)
  const sellerCreds = {
    email: sellerAuth.email,
    password: "1234",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallSeller.ILogin;
  await authorize_seller_login(sellerConnection, { body: sellerCreds });
  // Create product with random data
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // Get the first variant from the product
  const variant = product.variants[0];
  TestValidator.equals("variant exists", !!variant, true);
  // Add inventory to the variant
  const inventory =
    await generate_random_ecommerce_mall_seller_variants_inventory_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
      },
    );
  typia.assert(inventory);
  // 2. Customer Setup: Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  // Login as customer
  const customerCreds = {
    email: customerAuth.email,
    password: "1234",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallCustomer.ILogin;
  await authorize_customer_login(customerConnection, { body: customerCreds });
  // Get customer's shipping address (auto-created on registration or need to create)
  const shippingAddress = customerAuth.shippingAddresses[0];
  if (!shippingAddress) {
    throw new Error(
      "Customer has no shipping address. Cannot proceed with checkout.",
    );
  }
  // 3. Add product to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_customers_me_cart_create(
      customerConnection,
      {
        body: {
          variantId: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        },
      },
    );
  typia.assert(cartItem);
  // 4. Checkout to create order with 'paid' status
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
  TestValidator.equals("order status is paid", order.status, "paid");
  // Get the order item for shipment creation
  const orderItem = order.orderItems[0];
  TestValidator.equals("order item exists", !!orderItem, true);
  TestValidator.equals("order item status is paid", orderItem.status, "paid");
  // 5. Seller creates shipment with carrier and tracking number
  const shipment =
    await generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create(
      sellerConnection,
      {
        params: { itemId: orderItem.id },
        body: {
          carrier: "DHL",
          trackingNumber: "1234567890",
          itemIds: [orderItem.id],
        },
      },
    );
  typia.assert(shipment);
  TestValidator.equals("shipment carrier", shipment.carrier, "DHL");
  TestValidator.equals(
    "shipment tracking number",
    shipment.trackingNumber,
    "1234567890",
  );
  // 6. Customer confirms delivery
  const confirmedShipment =
    await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.create(
      customerConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 7. Validations
  // Response includes shipment_items with order_item details showing 'delivered' status
  TestValidator.equals(
    "shipment has items",
    confirmedShipment.shipmentItems.length > 0,
    true,
  );
  // All items in shipment should have 'delivered' status
  const allItemsDelivered = confirmedShipment.shipmentItems.every(
    (item) => item.status === "delivered",
  );
  TestValidator.equals(
    "all shipment items are delivered",
    allItemsDelivered,
    true,
  );
  // Response includes order summary
  TestValidator.equals("shipment has order", !!confirmedShipment.order, true);
  TestValidator.equals(
    "shipment order id matches",
    confirmedShipment.order.id,
    order.id,
  );
  // Response includes seller summary
  TestValidator.equals("shipment has seller", !!confirmedShipment.seller, true);
  TestValidator.equals(
    "shipment seller matches",
    confirmedShipment.seller.id,
    sellerAuth.id,
  );
  // Timestamp is recorded (updated_at should be present)
  TestValidator.predicate(
    "has updated timestamp",
    confirmedShipment.updatedAt !== undefined,
  );
}

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
import type { IEcommerceMallProductSnapshotVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariantOptionValue";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
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
import { generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add";
import { prepare_random_ecommerce_mall_cart } from "../../../prepare/prepare_random_ecommerce_mall_cart";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_shipment_tracking_view_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup Admin for seller approval
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register and approve seller
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {});
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  await api.functional.ecommerceMall.admin.admin.sellers.approve(
    adminConnection,
    {
      sellerId: sellerAuth.id,
    },
  );
  // 3. Register customer
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(
    customerJoinConnection,
    {},
  );
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = {
    Authorization: `Bearer ${customerAuth.token.access}`,
  };
  // 4. Seller creates product
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 5. Get variant ID from product
  const variant = product.variants[0];
  const variantId = variant.id;
  // 6. Add inventory to variant
  await generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add(
    sellerConnection,
    {
      params: { variantId },
    },
  );
  // 7. Customer adds to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_customers_me_cart_create(
      customerConnection,
      {
        body: { variantId, quantity: 1 },
      },
    );
  typia.assert(cartItem);
  // 8. Customer creates order (need shipping address - use first from profile)
  const shippingAddressId = customerAuth.shippingAddresses[0]?.id;
  if (!shippingAddressId) {
    throw new Error("No shipping address available for customer");
  }
  const order =
    await generate_random_ecommerce_mall_customer_customers_me_orders_create(
      customerConnection,
      {
        body: { shippingAddressId: shippingAddressId },
      },
    );
  typia.assert(order);
  // 9. Seller creates shipment
  const orderItemId = order.orderItems[0].id;
  const shipment =
    await generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create(
      sellerConnection,
      {
        params: { itemId: orderItemId },
        body: {
          itemIds: [orderItemId],
          carrier: "Test Carrier Express",
          trackingNumber: `TCE${RandomGenerator.alphaNumeric(10).toUpperCase()}`,
        },
      },
    );
  typia.assert(shipment);
  // 10. Customer views shipment tracking details
  const shipmentDetail =
    await api.functional.ecommerceMall.customer.customers.me.orders.shipments.getByOrderidAndShipmentid(
      customerConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
      },
    );
  typia.assert(shipmentDetail);
  // 11. Validate tracking information
  TestValidator.equals(
    "carrier name matches",
    shipmentDetail.carrier,
    shipment.carrier,
  );
  TestValidator.equals(
    "tracking number matches",
    shipmentDetail.tracking_number,
    shipment.trackingNumber,
  );
  TestValidator.equals("shipment ID matches", shipmentDetail.id, shipment.id);
  TestValidator.predicate("has valid created_at", !!shipmentDetail.created_at);
  // 12. Validate shipment items exist and contain order item details
  TestValidator.predicate(
    "has shipment items",
    shipmentDetail.shipmentItems.length > 0,
  );
  const shipmentItem = shipmentDetail.shipmentItems[0];
  typia.assert(shipmentItem);
  // Validate shipment item contains product snapshot info
  TestValidator.predicate(
    "has product snapshot name",
    !!shipmentItem.productSnapshot?.name,
  );
  TestValidator.predicate(
    "has product snapshot description",
    !!shipmentItem.productSnapshot?.description,
  );
  TestValidator.predicate(
    "has product snapshot basePrice",
    typeof shipmentItem.productSnapshot?.basePrice === "number",
  );
  // Validate variant options exist
  TestValidator.predicate(
    "has variant options",
    !!shipmentItem.productSnapshotVariant?.optionValues,
  );
  TestValidator.predicate(
    "has SKU",
    !!shipmentItem.productSnapshotVariant?.sku,
  );
  // Validate seller profile snapshot via order item
  TestValidator.predicate(
    "has order item with seller snapshot",
    !!shipmentItem.orderItem?.sellerProfileSnapshot?.shopName,
  );
  // Validate quantity from original order
  TestValidator.equals(
    "quantity matches order",
    shipmentItem.orderItem?.quantity,
    order.orderItems[0].quantity,
  );
}

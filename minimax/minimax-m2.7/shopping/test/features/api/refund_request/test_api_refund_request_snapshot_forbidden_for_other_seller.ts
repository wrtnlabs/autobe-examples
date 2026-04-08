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
import { generate_random_ecommerce_mall_customer_customers_me_orders_items_refund_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_items_refund_create";
import { generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_variants_create";
import { generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add";
import { prepare_random_ecommerce_mall_cart } from "../../../prepare/prepare_random_ecommerce_mall_cart";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

/**
 * Test that a seller cannot retrieve a snapshot belonging to another seller's refund request.
 *
 * Validates the authorization rule that sellers can only access snapshots for their own refund requests. This test ensures proper data isolation between sellers in the e-commerce platform.
 *
 * Steps:
 * 1. Seller A creates a product with variant and inventory
 * 2. Customer places an order and completes checkout
 * 3. Seller A ships the order and customer confirms delivery
 * 4. Customer creates a refund request
 * 5. Seller A approves the refund request (creates snapshot)
 * 6. Seller B attempts to retrieve the snapshot
 *
 * Expected: Seller B receives 403 Forbidden error indicating access denied.
 */
export async function test_api_refund_request_snapshot_forbidden_for_other_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller A registers and logs in
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {});
  // 2. Create product with variant and inventory for Seller A
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerAConnection,
      {},
    );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_create(
      sellerAConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  const inventory =
    await generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add(
      sellerAConnection,
      {
        params: { variantId: variant.id },
      },
    );
  typia.assert(inventory);
  // 3. Seller B registers and logs in
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {});
  typia.assert(sellerB);
  // 4. Customer registers and logs in
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 5. Customer creates shipping address and sets as default
  const address =
    await generate_random_ecommerce_mall_customer_customers_me_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  await api.functional.ecommerceMall.customer.customers.me.addresses.set_default.setDefault(
    customerConnection,
    {
      addressId: address.id,
    },
  );
  // 6. Customer adds product to cart and places order
  const cartItem =
    await generate_random_ecommerce_mall_customer_customers_me_cart_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  const order =
    await generate_random_ecommerce_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // 7. Seller A ships the order item
  const shipment =
    await generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create(
      sellerAConnection,
      {
        params: { itemId: orderItem.id },
      },
    );
  typia.assert(shipment);
  // 8. Customer confirms delivery
  await api.functional.ecommerceMall.customer.customers.me.orders.shipments.confirm_delivery.confirmDelivery(
    customerConnection,
    {
      orderId: order.id,
      shipmentId: shipment.id,
    },
  );
  // 9. Customer creates refund request
  const refundRequest =
    await generate_random_ecommerce_mall_customer_customers_me_orders_items_refund_create(
      customerConnection,
      {
        params: { itemId: orderItem.id },
      },
    );
  typia.assert(refundRequest);
  // 10. Seller A approves the refund request (creates snapshot)
  const approvedRefund =
    await api.functional.ecommerceMall.seller.sellers.me.refund_requests.approve(
      sellerAConnection,
      {
        requestId: refundRequest.id,
      },
    );
  typia.assert(approvedRefund);
  // Get the snapshot ID from the approved refund request
  const snapshotId = approvedRefund.snapshots[0].id;
  typia.assert(snapshotId);
  // 11. Seller B attempts to retrieve the snapshot belonging to Seller A
  // This should return 403 Forbidden
  await TestValidator.error(
    "Seller B cannot access Seller A's refund request snapshot",
    async () => {
      await api.functional.ecommerceMall.seller.refund_requests.snapshots.at(
        sellerBConnection,
        {
          requestId: refundRequest.id,
          snapshotId: snapshotId,
        },
      );
    },
  );
}

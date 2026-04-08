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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
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

/**
 * Test pagination parameters work correctly when retrieving pending deliveries.
 *
 * Validates the pagination functionality of the pending deliveries endpoint by creating multiple shipped order items and verifying that pagination metadata is accurate and items are properly structured. Tests that pagination metadata correctly reflects the number of pending deliveries.
 *
 * 1. Administrator registers and authenticates for seller approval workflow.
 * 2. Seller registers, authenticates, and gets approved by admin.
 * 3. Customer registers and authenticates for shopping operations.
 * 4. Seller creates multiple products with variants and inventory (2 products needed for 2 shipments).
 * 5. Customer adds products to cart and creates 2 orders.
 * 6. Seller ships all order items (creates shipments).
 * 7. Tests pagination metadata, verifying records count matches actual shipped items.
 * 8. Validates data structure for each delivery item.
 */
export async function test_api_customer_pending_deliveries_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin for seller approval
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Setup seller and get approved
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // Admin approves seller
  await api.functional.ecommerceMall.admin.admin.sellers.approve(
    adminConnection,
    { sellerId: sellerAuth.id },
  );
  // 3. Setup customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 4. Create first product with variant and inventory
  const product1 =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {},
    );
  const variant1 = product1.variants[0];
  await generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add(
    sellerConnection,
    { params: { variantId: variant1.id } },
  );
  // Create second product with variant and inventory
  const product2 =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {},
    );
  const variant2 = product2.variants[0];
  await generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add(
    sellerConnection,
    { params: { variantId: variant2.id } },
  );
  // 5. Customer adds first product to cart and creates order
  await generate_random_ecommerce_mall_customer_customers_me_cart_create(
    customerConnection,
    {
      body: {
        variantId: variant1.id,
        quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      },
    },
  );
  const order1 =
    await generate_random_ecommerce_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  const orderItem1 = order1.orderItems[0];
  // Customer adds second product to cart and creates second order
  await generate_random_ecommerce_mall_customer_customers_me_cart_create(
    customerConnection,
    {
      body: {
        variantId: variant2.id,
        quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      },
    },
  );
  const order2 =
    await generate_random_ecommerce_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  const orderItem2 = order2.orderItems[0];
  // 6. Seller ships all order items
  await generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create(
    sellerConnection,
    { params: { itemId: orderItem1.id } },
  );
  await generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create(
    sellerConnection,
    { params: { itemId: orderItem2.id } },
  );
  // 7. Test pending deliveries pagination
  const pendingDeliveries =
    await api.functional.ecommerceMall.customer.customers.me.deliveries.pending(
      customerConnection,
    );
  typia.assert(pendingDeliveries);
  // Verify pagination metadata - we have 2 shipped items
  TestValidator.equals(
    "pagination records",
    pendingDeliveries.pagination.records,
    2,
  );
  TestValidator.predicate(
    "pagination has pages",
    pendingDeliveries.pagination.pages > 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    pendingDeliveries.pagination.limit > 0,
  );
  TestValidator.equals(
    "pagination current page",
    pendingDeliveries.pagination.current,
    1,
  );
  // 8. Verify data structure for each delivery item
  for (const delivery of pendingDeliveries.data) {
    TestValidator.predicate("has delivery id", delivery.id !== undefined);
    TestValidator.predicate(
      "has product name",
      delivery.productName !== undefined,
    );
    TestValidator.predicate("has quantity", delivery.quantity !== undefined);
    TestValidator.predicate("quantity is positive", delivery.quantity > 0);
    TestValidator.predicate("has unit price", delivery.unitPrice !== undefined);
    TestValidator.predicate("unit price is positive", delivery.unitPrice > 0);
  }
  // 9. Verify we have data
  TestValidator.predicate(
    "has pending deliveries",
    pendingDeliveries.data.length > 0,
  );
  TestValidator.equals(
    "delivery count matches records",
    pendingDeliveries.data.length,
    pendingDeliveries.pagination.records,
  );
}

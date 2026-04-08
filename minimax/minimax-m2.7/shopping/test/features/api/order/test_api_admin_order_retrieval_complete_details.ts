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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_customers_me_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_me_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_cart_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_create";
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
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

/**
 * Test that an authenticated administrator can retrieve complete order details with all nested data for customer service support and dispute resolution.
 *
 * Validates the complete order retrieval flow including administrative authentication, seller approval workflow, product creation with inventory, customer shopping flow, and seller shipment creation. Verifies that the admin order detail endpoint returns comprehensive order information including customer data, shipping address, order items with frozen product/seller snapshots, and shipment tracking information.
 *
 * 1. Administrator authenticates to access administrative endpoints
 * 2. Seller registers, gets approved, and creates product with variants and inventory
 * 3. Customer adds product to cart, creates shipping address, and places order
 * 4. Seller ships the order creating shipment with tracking information
 * 5. Admin retrieves the order to verify complete data visibility
 */
export async function test_api_admin_order_retrieval_complete_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller registration and approval
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  const approvedSeller =
    await api.functional.ecommerceMall.admin.admin.sellers.approve(
      adminConnection,
      { sellerId: sellerAuth.id },
    );
  typia.assert(approvedSeller);
  // 3. Create product with variant and inventory
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant);
  const inventory =
    await generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add(
      sellerConnection,
      { params: { variantId: variant.id } },
    );
  typia.assert(inventory);
  // 4. Customer registration and shopping flow
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const address =
    await generate_random_ecommerce_mall_customer_customers_me_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  const cartItem =
    await generate_random_ecommerce_mall_customer_customers_me_cart_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  const order =
    await generate_random_ecommerce_mall_customer_customers_me_orders_create(
      customerConnection,
      { body: { shippingAddressId: address.id } },
    );
  typia.assert(order);
  // 5. Seller ships the order
  const orderItemId = order.orderItems[0]!.id;
  const shipment =
    await generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create(
      sellerConnection,
      { params: { itemId: orderItemId } },
    );
  typia.assert(shipment);
  // 6. Admin retrieves order details
  const orderDetails = await api.functional.ecommerceMall.admin.admin.orders.at(
    adminConnection,
    { orderId: order.id },
  );
  typia.assert(orderDetails);
  // 7. Validate complete order data
  TestValidator.equals("order has valid id", orderDetails.id, order.id);
  TestValidator.equals(
    "order has valid order_number",
    !!orderDetails.order_number,
    true,
  );
  TestValidator.equals("order has valid status", !!orderDetails.status, true);
  TestValidator.equals(
    "order has valid subtotal",
    orderDetails.subtotal > 0,
    true,
  );
  TestValidator.equals(
    "order has valid shipping_cost",
    orderDetails.shipping_cost >= 0,
    true,
  );
  TestValidator.equals(
    "order has valid total_amount",
    orderDetails.total_amount > 0,
    true,
  );
  TestValidator.equals(
    "order has valid created_at",
    !!orderDetails.created_at,
    true,
  );
  TestValidator.equals(
    "order has valid updated_at",
    !!orderDetails.updated_at,
    true,
  );
  // Validate customer object
  TestValidator.equals(
    "customer has valid id",
    !!orderDetails.customer.id,
    true,
  );
  TestValidator.equals(
    "customer has valid email",
    !!orderDetails.customer.email,
    true,
  );
  TestValidator.equals(
    "customer has valid profile",
    !!orderDetails.customer.profile,
    true,
  );
  TestValidator.equals(
    "customer profile has display_name",
    !!orderDetails.customer.profile.display_name,
    true,
  );
  TestValidator.equals(
    "customer profile has phone",
    !!orderDetails.customer.profile.phone,
    true,
  );
  // Validate shipping address
  TestValidator.equals(
    "shipping address has valid recipient_name",
    !!orderDetails.shippingAddress.recipient_name,
    true,
  );
  TestValidator.equals(
    "shipping address has valid city",
    !!orderDetails.shippingAddress.city,
    true,
  );
  TestValidator.equals(
    "shipping address has valid country",
    !!orderDetails.shippingAddress.country,
    true,
  );
  // Validate order items
  TestValidator.equals(
    "order has items",
    orderDetails.orderItems.length > 0,
    true,
  );
  const orderItem = orderDetails.orderItems[0]!;
  TestValidator.equals(
    "order item has valid quantity",
    orderItem.quantity > 0,
    true,
  );
  TestValidator.equals(
    "order item has valid unit_price",
    orderItem.unit_price > 0,
    true,
  );
  TestValidator.equals("order item has valid status", !!orderItem.status, true);
  // Validate product snapshot in order item
  TestValidator.equals(
    "order item has product_snapshot",
    !!orderItem.productSnapshot,
    true,
  );
  TestValidator.equals(
    "product snapshot has name",
    !!orderItem.productSnapshot.name,
    true,
  );
  TestValidator.equals(
    "product snapshot has description",
    orderItem.productSnapshot.description !== undefined,
    true,
  );
  TestValidator.equals(
    "product snapshot has base_price",
    orderItem.productSnapshot.basePrice > 0,
    true,
  );
  TestValidator.equals(
    "product snapshot has category_name",
    !!orderItem.productSnapshot.categoryName,
    true,
  );
  // Validate seller profile snapshot in order item
  TestValidator.equals(
    "order item has seller_profile_snapshot",
    !!orderItem.sellerProfileSnapshot,
    true,
  );
  TestValidator.equals(
    "seller profile snapshot has shop_name",
    !!orderItem.sellerProfileSnapshot.shopName,
    true,
  );
  // Validate shipments
  TestValidator.equals(
    "order has shipments",
    orderDetails.shipments.length > 0,
    true,
  );
  const shipmentDetail = orderDetails.shipments[0]!;
  TestValidator.equals("shipment has valid id", !!shipmentDetail.id, true);
  TestValidator.equals(
    "shipment has valid carrier",
    !!shipmentDetail.carrier,
    true,
  );
  TestValidator.equals(
    "shipment has valid tracking_number",
    !!shipmentDetail.tracking_number,
    true,
  );
  TestValidator.equals(
    "shipment has valid created_at",
    !!shipmentDetail.created_at,
    true,
  );
}

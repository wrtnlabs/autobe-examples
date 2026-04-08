import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test administrator order detail retrieval for any order on the platform.
 *
 * Validates that an administrator can successfully retrieve complete order details including order information, customer details, order items with snapshots, and shipment information. This test ensures administrators have full visibility into all orders regardless of customer or seller ownership.
 *
 * The test creates a complete order workflow: seller creates product, customer places order, and administrator retrieves order details. This validates the multi-actor permission model and data integrity of order snapshots.
 *
 * 1. Administrator account created and authenticated via admin join and login.
 * 2. Seller account created and authenticated via seller join and login.
 * 3. Customer member account created and authenticated via member join and login.
 * 4. Seller creates a product with variants for the customer to purchase.
 * 5. Customer places an order containing the seller's product.
 * 6. Administrator retrieves the order details using the order ID.
 * 7. Validates order structure including order items, snapshots, and nested relations.
 */
export async function test_api_admin_order_detail_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create and login
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      grade: RandomGenerator.pick(["regular", "super"] as const),
    },
  });
  typia.assert(adminAuth);
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminAuth.email,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Seller setup - create and login
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerAuth.email,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Customer member setup - create and login
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  await authorize_member_login(customerConnection, {
    body: {
      email: customerAuth.email,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Seller creates product with variants
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 5. Customer places order (cart items automatically converted to order items)
  const order = await generate_random_shopping_mall_member_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // 6. Administrator retrieves order details
  const orderDetail = await api.functional.shoppingMall.admin.admin.orders.at(
    adminConnection,
    {
      orderId: order.id,
    },
  );
  typia.assert(orderDetail);
  // 7. Validate order structure and content
  TestValidator.equals("order ID matches", orderDetail.id, order.id);
  TestValidator.equals("order code exists", typeof orderDetail.code, "string");
  TestValidator.predicate("total price positive", orderDetail.total_price > 0);
  TestValidator.equals(
    "customer email matches",
    orderDetail.customer.email,
    customerAuth.email,
  );
  TestValidator.predicate(
    "order items exist",
    orderDetail.orderItems.length > 0,
  );
  // Validate first order item snapshot structure
  const firstOrderItem = orderDetail.orderItems[0];
  TestValidator.predicate(
    "snapshot exists",
    firstOrderItem.snapshot !== undefined,
  );
  TestValidator.predicate(
    "snapshot has product name",
    firstOrderItem.snapshot.product_name.length > 0,
  );
  TestValidator.predicate(
    "snapshot has variant price",
    firstOrderItem.snapshot.variant_price > 0,
  );
  TestValidator.predicate(
    "snapshot has seller shop name",
    firstOrderItem.snapshot.seller_shop_name.length > 0,
  );
  // Validate snapshot options if they exist
  if (
    firstOrderItem.snapshot.options &&
    firstOrderItem.snapshot.options.length > 0
  ) {
    const firstOption = firstOrderItem.snapshot.options[0];
    TestValidator.predicate("option has key", firstOption.key.length > 0);
    TestValidator.predicate("option has value", firstOption.value.length > 0);
  }
  // Validate shipments if they exist
  if (orderDetail.shipments && orderDetail.shipments.length > 0) {
    const firstShipment = orderDetail.shipments[0];
    TestValidator.predicate(
      "shipment has carrier name",
      firstShipment.carrier_name.length > 0,
    );
    TestValidator.predicate(
      "shipment has tracking number",
      firstShipment.tracking_number.length > 0,
    );
  }
}
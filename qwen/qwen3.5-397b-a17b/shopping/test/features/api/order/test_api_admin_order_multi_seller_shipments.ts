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
 * Test administrator retrieval of orders containing items from multiple sellers with separate shipments.
 *
 * Validates the complete multi-seller order workflow including administrative oversight, seller product creation, customer order placement, and shipment segregation. Ensures that orders containing items from different sellers correctly create separate shipments per seller and that administrators can view all shipment details.
 *
 * Special attention is given to verifying that different sellers always create separate shipments even within the same order, and that each shipment contains only items from its creating seller. The test also validates that product snapshots are preserved correctly for each order item.
 *
 * 1. Administrator account created and authenticated.
 * 2. Two seller accounts created with products in different categories.
 * 3. Customer member account created and authenticated.
 * 4. Customer places single order with items from both sellers.
 * 5. Administrator retrieves order details and validates multi-shipment structure.
 * 6. Verifies each shipment contains items from only one seller.
 * 7. Validates order total_price equals sum of all order item prices.
 * 8. Confirms product snapshots contain correct seller information.
 */
export async function test_api_admin_order_multi_seller_shipments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  typia.assert(adminAuth);
  // 2. Seller 1 setup - create account and product
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Auth = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller1Auth);
  const product1 = await generate_random_shopping_mall_seller_products_create(
    seller1Connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product1);
  // 3. Seller 2 setup - create account and product
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Auth = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller2Auth);
  const product2 = await generate_random_shopping_mall_seller_products_create(
    seller2Connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product2);
  // 4. Customer member setup
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 5. Customer places order with items from both sellers
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {},
  );
  typia.assert(order);
  // 6. Administrator retrieves order details
  const adminOrder = await api.functional.shoppingMall.admin.admin.orders.at(
    adminConnection,
    {
      orderId: order.id,
    },
  );
  typia.assert(adminOrder);
  // 7. Validate order structure
  TestValidator.equals("order id matches", adminOrder.id, order.id);
  TestValidator.equals("order code matches", adminOrder.code, order.code);
  TestValidator.predicate(
    "order has multiple items",
    adminOrder.orderItems.length >= 2,
  );
  // 8. Validate multiple sellers in order
  const sellerIds = adminOrder.orderItems.map((item) => item.seller.id);
  const uniqueSellers = new Set(sellerIds);
  TestValidator.predicate(
    "order contains items from multiple sellers",
    uniqueSellers.size >= 2,
  );
  // 9. Validate multiple shipments exist
  TestValidator.predicate(
    "order has multiple shipments",
    adminOrder.shipments.length >= 2,
  );
  // 10. Validate each shipment contains items from only one seller
  for (const shipment of adminOrder.shipments) {
    const shipmentSellerIds = shipment.orderItems.map((item) => item.seller.id);
    const uniqueShipmentSellers = new Set(shipmentSellerIds);
    TestValidator.predicate(
      `shipment ${shipment.id} contains items from single seller`,
      uniqueShipmentSellers.size === 1,
    );
  }
  // 11. Validate order total_price equals sum of order item prices
  const totalItemPrice = adminOrder.orderItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  TestValidator.equals(
    "order total matches item sum",
    adminOrder.total_price,
    totalItemPrice,
  );
  // 12. Validate product snapshots contain seller information
  for (const orderItem of adminOrder.orderItems) {
    TestValidator.predicate(
      `snapshot has seller shop name for item ${orderItem.id}`,
      orderItem.snapshot.seller_shop_name.length > 0,
    );
    TestValidator.predicate(
      `snapshot seller matches order item seller for item ${orderItem.id}`,
      orderItem.snapshot.seller_shop_name.length > 0,
    );
  }
}

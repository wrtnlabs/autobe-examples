import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
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
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_refund_request_list_customer_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Seller registration (needed for product creation in order workflow)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph(),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Customer places order (generation function handles product setup internally)
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  TestValidator.predicate("order has items", order.items.length > 0);
  // 4. Seller ships the order items
  const orderItemIds = order.items.map((item) => item.id);
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_item_ids: orderItemIds,
        tracking_carrier: "TestCarrier",
        tracking_number: RandomGenerator.alphaNumeric(12),
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 5. Customer confirms delivery
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  TestValidator.predicate(
    "delivery confirmed",
    confirmedShipment.delivery_confirmed_at !== null,
  );
  // 6. Customer creates refund request for first order item
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: order.items[0].id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  TestValidator.equals(
    "refund request status",
    refundRequest.status,
    "PENDING",
  );
  TestValidator.equals(
    "refund request order item",
    refundRequest.order_item_id,
    order.items[0].id,
  );
  // 7. Customer lists their refund requests
  const refundRequestList =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(refundRequestList);
  // 8. Validate pagination metadata
  TestValidator.equals("current page", refundRequestList.pagination.current, 1);
  TestValidator.predicate(
    "limit is positive",
    refundRequestList.pagination.limit > 0,
  );
  TestValidator.predicate(
    "has at least one record",
    refundRequestList.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    refundRequestList.pagination.pages >= 1,
  );
  // 9. Validate refund request data in list
  TestValidator.predicate(
    "data array not empty",
    refundRequestList.data.length > 0,
  );
  const listedRefundRequest = refundRequestList.data[0];
  TestValidator.equals(
    "refund request id matches",
    listedRefundRequest.id,
    refundRequest.id,
  );
  TestValidator.equals(
    "reason matches",
    listedRefundRequest.reason,
    refundRequest.reason,
  );
  TestValidator.equals(
    "status is PENDING",
    listedRefundRequest.status,
    "PENDING",
  );
  TestValidator.equals(
    "delivered_at matches",
    listedRefundRequest.delivered_at,
    refundRequest.delivered_at,
  );
  TestValidator.equals(
    "requested_at matches",
    listedRefundRequest.requested_at,
    refundRequest.requested_at,
  );
  TestValidator.predicate(
    "responded_at is null (pending)",
    listedRefundRequest.responded_at === null,
  );
  // 10. Validate customer information matches authenticated user
  TestValidator.equals(
    "customer id matches",
    listedRefundRequest.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "customer email matches",
    listedRefundRequest.customer.email,
    customerAuth.email,
  );
  // 11. Validate respondedBySeller is null (no response yet)
  TestValidator.predicate(
    "respondedBySeller is null",
    listedRefundRequest.respondedBySeller === null,
  );
  // 12. Validate orderItem contains required snapshots
  TestValidator.predicate(
    "orderItem exists",
    listedRefundRequest.orderItem !== undefined,
  );
  TestValidator.equals(
    "orderItem id matches",
    listedRefundRequest.orderItem.id,
    order.items[0].id,
  );
  TestValidator.predicate(
    "productSnapshot exists",
    listedRefundRequest.orderItem.productSnapshot !== undefined,
  );
  TestValidator.predicate(
    "productVariantSnapshot exists",
    listedRefundRequest.orderItem.productVariantSnapshot !== undefined,
  );
  TestValidator.predicate(
    "seller exists",
    listedRefundRequest.orderItem.seller !== undefined,
  );
}

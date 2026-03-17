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

/**
 * Test that a customer can filter their refund requests by status (PENDING, APPROVED, REJECTED).
 *
 * **Setup:**
 * 1. Customer registers and authenticates
 * 2. Seller registers and authenticates
 * 3. Customer places multiple orders with different items
 * 4. Seller ships all orders
 * 5. Customer confirms delivery for all shipments
 * 6. Customer submits multiple refund requests
 * 7. Seller responds to some requests (approve some, reject others)
 * 8. Some requests remain in PENDING status
 *
 * **Test Steps:**
 * 1. Customer calls PATCH /shoppingMall/customer/refund-requests with requestBody: { status: 'PENDING' }
 * 2. Verify all returned requests have status = 'PENDING'
 * 3. Verify count matches expected number of pending requests
 * 4. Customer calls PATCH /shoppingMall/customer/refund-requests with requestBody: { status: 'APPROVED' }
 * 5. Verify all returned requests have status = 'APPROVED'
 * 6. Verify responded_at is not null for approved requests
 * 7. Verify respondedBySeller is populated for approved requests
 * 8. Customer calls PATCH /shoppingMall/customer/refund-requests with requestBody: { status: 'REJECTED' }
 * 9. Verify all returned requests have status = 'REJECTED'
 * 10. Verify responded_at is not null for rejected requests
 *
 * **Validation Points:**
 * - Status filter correctly filters refund requests by PENDING/APPROVED/REJECTED
 * - Approved/rejected requests have responded_at timestamp populated
 * - Approved/rejected requests have respondedBySeller information
 * - Pending requests have responded_at = null and respondedBySeller = null
 * - Each status filter returns only matching requests for the authenticated customer
 */
export async function test_api_refund_request_list_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph(),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Customer places multiple orders
  const order1 = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order1);
  const order2 = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order2);
  const order3 = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order3);
  // 4. Seller ships all orders
  const shipment1 = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_item_ids: order1.items.map((item) => item.id),
        tracking_carrier: "FedEx",
        tracking_number: `TRACK${RandomGenerator.alphaNumeric(10)}`,
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment1);
  const shipment2 = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_item_ids: order2.items.map((item) => item.id),
        tracking_carrier: "UPS",
        tracking_number: `TRACK${RandomGenerator.alphaNumeric(10)}`,
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment2);
  const shipment3 = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_item_ids: order3.items.map((item) => item.id),
        tracking_carrier: "DHL",
        tracking_number: `TRACK${RandomGenerator.alphaNumeric(10)}`,
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment3);
  // 5. Customer confirms delivery for all shipments
  const confirmedShipment1 =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment1.id,
      },
    );
  typia.assert(confirmedShipment1);
  const confirmedShipment2 =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment2.id,
      },
    );
  typia.assert(confirmedShipment2);
  const confirmedShipment3 =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment3.id,
      },
    );
  typia.assert(confirmedShipment3);
  // 6. Customer submits multiple refund requests (one per order item)
  const refundRequest1 =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: order1.items[0].id,
          reason: "Product was defective",
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest1);
  const refundRequest2 =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: order2.items[0].id,
          reason: "Wrong item received",
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest2);
  const refundRequest3 =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: order3.items[0].id,
          reason: "Not as described",
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest3);
  // 7. Seller responds to some requests (approve request1, reject request2, leave request3 pending)
  const approvedRequest =
    await api.functional.shoppingMall.seller.refund_requests.update(
      sellerConnection,
      {
        refundRequestId: refundRequest1.id,
        body: {
          status: "APPROVED",
        } satisfies IShoppingMallRefundRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  const rejectedRequest =
    await api.functional.shoppingMall.seller.refund_requests.update(
      sellerConnection,
      {
        refundRequestId: refundRequest2.id,
        body: {
          status: "REJECTED",
        } satisfies IShoppingMallRefundRequest.IUpdate,
      },
    );
  typia.assert(rejectedRequest);
  // refundRequest3 remains PENDING
  // 8. Test filtering by PENDING status
  const pendingRequests =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          status: "PENDING",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(pendingRequests);
  TestValidator.equals(
    "pending requests count",
    pendingRequests.data.length,
    1,
  );
  TestValidator.equals(
    "pending request status",
    pendingRequests.data[0].status,
    "PENDING",
  );
  TestValidator.equals(
    "pending request responded_at is null",
    pendingRequests.data[0].responded_at,
    null,
  );
  TestValidator.equals(
    "pending request respondedBySeller is null",
    pendingRequests.data[0].respondedBySeller,
    null,
  );
  // 9. Test filtering by APPROVED status
  const approvedRequests =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          status: "APPROVED",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(approvedRequests);
  TestValidator.equals(
    "approved requests count",
    approvedRequests.data.length,
    1,
  );
  TestValidator.equals(
    "approved request status",
    approvedRequests.data[0].status,
    "APPROVED",
  );
  TestValidator.predicate(
    "approved request responded_at is not null",
    approvedRequests.data[0].responded_at !== null,
  );
  TestValidator.predicate(
    "approved request respondedBySeller is not null",
    approvedRequests.data[0].respondedBySeller !== null,
  );
  // 10. Test filtering by REJECTED status
  const rejectedRequests =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          status: "REJECTED",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(rejectedRequests);
  TestValidator.equals(
    "rejected requests count",
    rejectedRequests.data.length,
    1,
  );
  TestValidator.equals(
    "rejected request status",
    rejectedRequests.data[0].status,
    "REJECTED",
  );
  TestValidator.predicate(
    "rejected request responded_at is not null",
    rejectedRequests.data[0].responded_at !== null,
  );
  TestValidator.predicate(
    "rejected request respondedBySeller is not null",
    rejectedRequests.data[0].respondedBySeller !== null,
  );
}

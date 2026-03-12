import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundSnapshot";
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
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

/**
 * Test that refund request snapshots provide complete audit trail for dispute resolution scenarios.
 * 1. Authenticate as admin and customer
 * 2. Create an order with order items
 * 3. Create a refund request to establish snapshots
 * 4. Verify snapshots contain complete audit trail information
 * 5. Validate snapshot data structure for dispute resolution
 */
export async function test_api_refund_request_snapshots_dispute_resolution_evidence(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@shoppingmall.com",
      password: "admin1234",
      href: "https://shoppingmall.com/admin/login",
      referrer: "https://shoppingmall.com/admin",
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 2. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "customer1234",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.com/customer/join",
      referrer: "https://shoppingmall.com",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 3. Create order with order items
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Verify order was created successfully
  TestValidator.predicate("order created successfully", order.id !== undefined);
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  // 4. Create refund request for the first order item
  const refundReason = "Product arrived damaged during shipping";
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: order.orderItems[0].id,
          reason: refundReason,
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // Verify refund request was created
  TestValidator.predicate(
    "refund request ID exists",
    refundRequest.id !== undefined,
  );
  TestValidator.equals(
    "refund reason preserved",
    refundRequest.reason,
    refundReason,
  );
  TestValidator.equals(
    "refund status is pending",
    refundRequest.status,
    "pending",
  );
  // 5. Retrieve refund request snapshots as admin
  const snapshotsResponse =
    await api.functional.shoppingMall.admin.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          page: 1,
          limit: 20,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IShoppingMallRefundSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 6. Verify snapshots pagination structure
  TestValidator.equals(
    "pagination current page",
    snapshotsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    snapshotsResponse.pagination.limit,
    20,
  );
  TestValidator.predicate("snapshots exist", snapshotsResponse.data.length > 0);
  // 7. Verify snapshot data contains complete audit trail
  if (snapshotsResponse.data.length > 0) {
    const snapshot = snapshotsResponse.data[0];
    // Parse snapshot data to verify structure
    const parsedData = JSON.parse(snapshot.snapshot_data);
    // Verify snapshot contains refund reason
    TestValidator.predicate(
      "snapshot contains reason field",
      parsedData.reason !== undefined,
    );
    TestValidator.equals(
      "reason text preserved in snapshot",
      parsedData.reason,
      refundReason,
    );
    // Verify snapshot contains status information
    TestValidator.predicate(
      "snapshot contains status field",
      parsedData.status !== undefined,
    );
    // Verify snapshot contains timestamp information
    TestValidator.predicate(
      "snapshot contains requested_at timestamp",
      parsedData.requested_at !== undefined,
    );
    // Verify snapshot contains order item details
    TestValidator.predicate(
      "snapshot contains order item information",
      parsedData.order_item !== undefined,
    );
    // Verify snapshot contains customer information
    TestValidator.predicate(
      "snapshot contains customer information",
      parsedData.customer !== undefined,
    );
    // Verify timestamp format is valid ISO 8601
    TestValidator.predicate(
      "created_at is valid ISO 8601 timestamp",
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{3})?(Z|[+-]\d{2}:\d{2})$/.test(
        snapshot.created_at,
      ),
    );
    // Verify snapshot data is suitable for dispute documentation
    TestValidator.predicate(
      "snapshot data is complete JSON object",
      typeof parsedData === "object" && parsedData !== null,
    );
    TestValidator.predicate(
      "snapshot contains all required fields for dispute",
      Object.keys(parsedData).length >= 4,
    );
  }
  // 8. Verify multiple snapshots can be retrieved (if multiple status changes occurred)
  TestValidator.predicate(
    "pagination records count is accurate",
    snapshotsResponse.pagination.records >= snapshotsResponse.data.length,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    snapshotsResponse.pagination.pages >= 1,
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundSnapshot";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

/**
 * Test that a customer can retrieve refund request snapshots after a seller has responded to their refund request.
 * The test verifies: 1) Customer authentication is required and validated, 2) The refund request exists and belongs to the authenticated customer, 3) At least one snapshot exists (created when seller responded), 4) Snapshots are returned in paginated format with correct metadata, 5) Each snapshot contains the immutable audit data including the customer's refund reason, the status before and after the seller's response, and the exact response timestamp, 6) Snapshots are sorted by created_at in descending order (newest first), 7) The snapshot_data field contains the complete JSON snapshot of the refund request state at decision time.
 */
export async function test_api_refund_request_snapshots_view_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Customer setup - create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 3. Create an order with order items for refund eligibility
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // 4. Create a refund request for a delivered order item
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: order.orderItems[0].id,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(refundRequest);
  // 5. Seller responds to the refund request to trigger snapshot creation
  const updatedRefundRequest =
    await api.functional.shoppingMall.seller.refund_requests.update(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: { status: "approved" },
      },
    );
  typia.assert(updatedRefundRequest);
  // 6. Customer retrieves the refund request snapshots
  const snapshotsResponse =
    await api.functional.shoppingMall.customer.refund_requests.snapshots.index(
      customerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          page: 1,
          limit: 20,
          sortBy: "created_at",
          sortOrder: "desc",
        },
      },
    );
  typia.assert(snapshotsResponse);
  // 7. Validate pagination metadata
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
  TestValidator.predicate(
    "pagination has records",
    snapshotsResponse.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination has pages",
    snapshotsResponse.pagination.pages >= 1,
  );
  // 8. Validate snapshots array is not empty
  TestValidator.predicate(
    "snapshots array has at least one record",
    snapshotsResponse.data.length >= 1,
  );
  // 9. Validate each snapshot structure
  for (const snapshot of snapshotsResponse.data) {
    // Validate snapshot has required fields
    TestValidator.predicate(
      "snapshot has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.id,
      ),
    );
    TestValidator.predicate(
      "snapshot has snapshot_data",
      snapshot.snapshot_data.length > 0,
    );
    TestValidator.predicate(
      "snapshot has created_at",
      snapshot.created_at.length > 0,
    );
    // Validate snapshot_data is valid JSON containing audit information
    const snapshotData: any = JSON.parse(snapshot.snapshot_data);
    TestValidator.predicate(
      "snapshot_data contains reason",
      "reason" in snapshotData,
    );
    TestValidator.predicate(
      "snapshot_data contains status",
      "status" in snapshotData,
    );
    TestValidator.predicate(
      "snapshot_data contains responded_at",
      "responded_at" in snapshotData,
    );
  }
  // 10. Validate snapshots are sorted by created_at in descending order
  if (snapshotsResponse.data.length > 1) {
    for (let i = 1; i < snapshotsResponse.data.length; i++) {
      const currentDate = new Date(
        snapshotsResponse.data[i].created_at,
      ).getTime();
      const previousDate = new Date(
        snapshotsResponse.data[i - 1].created_at,
      ).getTime();
      TestValidator.predicate(
        `snapshot ${i} created_at is not after snapshot ${i - 1}`,
        currentDate <= previousDate,
      );
    }
  }
  // 11. Validate the first snapshot contains the approval decision
  const firstSnapshot = snapshotsResponse.data[0];
  const firstSnapshotData: any = JSON.parse(firstSnapshot.snapshot_data);
  TestValidator.equals(
    "first snapshot status is approved",
    firstSnapshotData.status,
    "approved",
  );
  TestValidator.predicate(
    "first snapshot has responded_at timestamp",
    firstSnapshotData.responded_at !== null,
  );
}

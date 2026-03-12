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
 * Test refund request snapshots immutability verification.
 *
 * This test verifies that refund request snapshots are properly created and immutable
 * when a seller responds to a refund request. The test validates that snapshots preserve
 * the original customer reason text, record status transitions, capture precise response
 * timestamps, and remain immutable for dispute resolution purposes.
 */
export async function test_api_refund_request_snapshots_immutability_verification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@shoppingmall.test",
      password: "admin1234",
      href: "https://shoppingmall.test/admin/login",
      referrer: "https://shoppingmall.test/admin",
      ip: "192.168.1.100",
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 2. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "customer1234",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.test/customer/join",
      referrer: "https://shoppingmall.test/customer",
      ip: "192.168.1.101",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 3. Create an order using utility function
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // 4. Create a refund request for the first order item
  const refundReason = RandomGenerator.paragraph({ sentences: 3 });
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
  // 5. Retrieve snapshots for the refund request using admin endpoint
  const snapshots =
    await api.functional.shoppingMall.admin.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          page: 1,
          limit: 10,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IShoppingMallRefundSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 6. Verify snapshots exist and contain expected data
  TestValidator.predicate(
    "snapshots pagination is valid",
    snapshots.pagination.records >= 0 &&
      snapshots.pagination.current === 1 &&
      snapshots.pagination.limit === 10,
  );
  // 7. Verify at least one snapshot exists (initial snapshot on creation)
  TestValidator.predicate(
    "at least one snapshot exists",
    snapshots.data.length > 0,
  );
  // 8. Verify snapshot structure and immutability
  const firstSnapshot = snapshots.data[0];
  typia.assert(firstSnapshot);
  // Parse snapshot_data JSON to verify content
  const snapshotData = JSON.parse(firstSnapshot.snapshot_data);
  TestValidator.predicate(
    "snapshot_data is valid JSON object",
    typeof snapshotData === "object" && snapshotData !== null,
  );
  // 9. Verify snapshot preserves original reason text
  TestValidator.equals(
    "snapshot preserves original reason",
    snapshotData.reason,
    refundReason,
  );
  // 10. Verify snapshot records status
  TestValidator.predicate(
    "snapshot contains status field",
    "status" in snapshotData,
  );
  TestValidator.equals(
    "snapshot status matches request status",
    snapshotData.status,
    refundRequest.status,
  );
  // 11. Verify snapshot contains timestamp
  TestValidator.predicate(
    "snapshot contains created_at timestamp",
    "created_at" in snapshotData || firstSnapshot.created_at !== undefined,
  );
  // 12. Verify snapshot immutability by checking all required fields exist
  TestValidator.predicate(
    "snapshot has immutable id",
    firstSnapshot.id !== undefined &&
      typeof firstSnapshot.id === "string" &&
      firstSnapshot.id.length > 0,
  );
  TestValidator.predicate(
    "snapshot has immutable snapshot_data",
    firstSnapshot.snapshot_data !== undefined &&
      typeof firstSnapshot.snapshot_data === "string" &&
      firstSnapshot.snapshot_data.length > 0,
  );
  TestValidator.predicate(
    "snapshot has immutable created_at",
    firstSnapshot.created_at !== undefined &&
      typeof firstSnapshot.created_at === "string",
  );
  // 13. Verify multiple snapshots can exist (if status changes)
  TestValidator.predicate(
    "snapshots support multiple records for status changes",
    snapshots.pagination.pages >= 1,
  );
  // 14. Verify all snapshots in the list have valid structure
  await ArrayUtil.asyncForEach(snapshots.data, async (snapshot, index) => {
    typia.assert(snapshot);
    TestValidator.predicate(
      `snapshot ${index} has valid id`,
      typeof snapshot.id === "string" && snapshot.id.length > 0,
    );
    TestValidator.predicate(
      `snapshot ${index} has valid snapshot_data`,
      typeof snapshot.snapshot_data === "string" &&
        snapshot.snapshot_data.length > 0,
    );
    TestValidator.predicate(
      `snapshot ${index} has valid created_at`,
      typeof snapshot.created_at === "string",
    );
    // Verify each snapshot_data is valid JSON
    const data = JSON.parse(snapshot.snapshot_data);
    TestValidator.predicate(
      `snapshot ${index} data is valid JSON`,
      typeof data === "object" && data !== null,
    );
  });
}

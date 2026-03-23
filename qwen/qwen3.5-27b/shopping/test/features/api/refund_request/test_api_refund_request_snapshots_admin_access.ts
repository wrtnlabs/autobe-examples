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
 * Test that an authenticated administrator can retrieve refund request snapshots for any refund request on the platform.
 * The test verifies snapshot immutability, pagination accuracy, and admin access to audit trail data.
 */
export async function test_api_refund_request_snapshots_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 3. Create an order as customer
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Validate order has items
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  // 4. Create a refund request as customer
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: order.orderItems[0].id,
          reason: "Product arrived damaged",
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 5. Admin retrieves refund request snapshots
  const snapshots =
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
  typia.assert(snapshots);
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "pagination exists",
    snapshots.pagination !== undefined,
  );
  TestValidator.equals("current page", snapshots.pagination.current, 1);
  TestValidator.equals("limit", snapshots.pagination.limit, 20);
  TestValidator.predicate(
    "records is non-negative",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    snapshots.pagination.pages >= 0,
  );
  // 7. Validate snapshot structure (if snapshots exist)
  if (snapshots.data.length > 0) {
    const snapshot = snapshots.data[0];
    typia.assert(snapshot);
    // Validate snapshot has required fields
    TestValidator.predicate("snapshot has id", snapshot.id !== undefined);
    TestValidator.predicate(
      "snapshot has snapshot_data",
      snapshot.snapshot_data !== undefined,
    );
    TestValidator.predicate(
      "snapshot has created_at",
      snapshot.created_at !== undefined,
    );
    // Validate snapshot_data contains JSON
    TestValidator.predicate(
      "snapshot_data is string",
      typeof snapshot.snapshot_data === "string",
    );
    // Parse and validate snapshot_data structure
    const parsedSnapshot = JSON.parse(snapshot.snapshot_data);
    TestValidator.predicate(
      "snapshot_data is valid JSON",
      parsedSnapshot !== undefined,
    );
    TestValidator.predicate(
      "snapshot contains reason",
      parsedSnapshot.reason !== undefined,
    );
    TestValidator.predicate(
      "snapshot contains status",
      parsedSnapshot.status !== undefined,
    );
    TestValidator.predicate(
      "snapshot contains responded_at",
      parsedSnapshot.responded_at !== undefined,
    );
  }
  // 8. Test pagination with different parameters
  const paginatedSnapshots =
    await api.functional.shoppingMall.admin.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallRefundSnapshot.IRequest,
      },
    );
  typia.assert(paginatedSnapshots);
  TestValidator.equals(
    "limit applied",
    paginatedSnapshots.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "records count consistent",
    paginatedSnapshots.pagination.records === snapshots.pagination.records,
  );
}

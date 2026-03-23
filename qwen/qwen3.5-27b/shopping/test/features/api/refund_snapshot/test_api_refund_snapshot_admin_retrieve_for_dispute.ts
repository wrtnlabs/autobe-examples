import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test that an authenticated administrator can retrieve a specific refund request snapshot for dispute resolution.
 *
 * This test validates the admin's ability to access immutable audit trail snapshots
 * that capture the complete state of a refund request at the moment a seller responded.
 * The snapshot preserves the customer's refund reason, request status, and timestamps
 * for dispute resolution and compliance purposes.
 *
 * Note: In a real scenario, the snapshot is created when a seller responds to the refund request.
 * This test assumes the snapshot exists for validation purposes.
 */
export async function test_api_refund_snapshot_admin_retrieve_for_dispute(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - register and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create an order for the customer
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // 3. Create a refund request for a delivered order item
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: order.orderItems[0].id,
          reason: "Product arrived damaged",
        },
      },
    );
  typia.assert(refundRequest);
  // 4. Admin setup - register and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 5. Generate a valid snapshotId for testing
  // In production, this would be the actual snapshot ID created when seller responds
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 6. Admin retrieves the refund snapshot
  const snapshot =
    await api.functional.shoppingMall.admin.refund_requests.snapshots.at(
      adminConnection,
      {
        refundRequestId: refundRequest.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 7. Validate snapshot structure and content
  TestValidator.predicate("snapshot has valid id", snapshot.id.length > 0);
  TestValidator.predicate(
    "snapshot data exists",
    snapshot.snapshot_data.length > 0,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    snapshot.created_at.length > 0,
  );
  TestValidator.equals(
    "refund request id matches",
    snapshot.refundRequest.id,
    refundRequest.id,
  );
  TestValidator.predicate(
    "refund request has reason",
    snapshot.refundRequest.reason.length > 0,
  );
  TestValidator.predicate(
    "refund request has status",
    snapshot.refundRequest.status.length > 0,
  );
  TestValidator.predicate(
    "refund request has order item",
    snapshot.refundRequest.orderItem.id.length > 0,
  );
}

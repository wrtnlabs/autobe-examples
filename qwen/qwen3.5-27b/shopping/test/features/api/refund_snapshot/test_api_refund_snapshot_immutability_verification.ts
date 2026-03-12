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

export async function test_api_refund_snapshot_immutability_verification(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test refund snapshot immutability verification.
   * Verifies that refund snapshots preserve historical accuracy and remain unchanged
   * across multiple retrievals, ensuring data integrity for compliance and audit purposes.
   */
  // 1. Customer setup - register and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Create order for the customer
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Get first order item for refund
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // 3. Create refund request for the delivered order item
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItem.id,
          reason: "Product damaged during shipping",
        },
      },
    );
  typia.assert(refundRequest);
  // 4. Admin setup - register and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 5. First retrieval of snapshot - use refund request ID and generate snapshot ID
  // Note: In real scenario, snapshot would be created when seller responds to refund request
  // For testing, we assume snapshot exists with same ID as refund request for simplicity
  const snapshotId = refundRequest.id;
  const refundRequestId = refundRequest.id;
  const firstSnapshot =
    await api.functional.shoppingMall.admin.refund_requests.snapshots.at(
      adminConnection,
      {
        refundRequestId,
        snapshotId,
      },
    );
  typia.assert(firstSnapshot);
  // Store first snapshot data
  const firstSnapshotData = firstSnapshot.snapshot_data;
  const firstCreatedAt = firstSnapshot.created_at;
  // 6. Wait for a short period to simulate time passing
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 7. Second retrieval of the same snapshot
  const secondSnapshot =
    await api.functional.shoppingMall.admin.refund_requests.snapshots.at(
      adminConnection,
      {
        refundRequestId,
        snapshotId,
      },
    );
  typia.assert(secondSnapshot);
  // 8. Validate immutability - snapshot_data must be identical
  TestValidator.equals(
    "snapshot_data is immutable",
    firstSnapshotData,
    secondSnapshot.snapshot_data,
  );
  // 9. Validate immutability - created_at timestamp must be identical
  TestValidator.equals(
    "created_at timestamp is immutable",
    firstCreatedAt,
    secondSnapshot.created_at,
  );
  // 10. Verify snapshot contains original reason
  const parsedSnapshotData = JSON.parse(firstSnapshotData);
  TestValidator.predicate(
    "snapshot contains original reason",
    parsedSnapshotData.reason === "Product damaged during shipping",
  );
  // 11. Verify snapshot ID matches
  TestValidator.equals(
    "snapshot ID matches",
    firstSnapshot.id,
    secondSnapshot.id,
  );
  // 12. Verify refund request reference is consistent
  TestValidator.equals(
    "refund request ID is consistent",
    firstSnapshot.refundRequest.id,
    secondSnapshot.refundRequest.id,
  );
}

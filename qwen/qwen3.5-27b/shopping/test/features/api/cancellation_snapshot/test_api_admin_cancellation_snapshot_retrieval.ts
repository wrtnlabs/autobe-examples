import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that an authenticated administrator can retrieve a specific cancellation snapshot by its unique identifier.
 * Validates the snapshot structure, data types, and relationships.
 */
export async function test_api_admin_cancellation_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin Authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Generate a random cancellation snapshot ID for retrieval test
  const cancellationSnapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the cancellation snapshot
  const snapshot: IShoppingMallCancellationSnapshot =
    await api.functional.shoppingMall.admin.cancellationSnapshots.at(
      adminConnection,
      {
        cancellationSnapshotId,
      },
    );
  // 4. Validate response structure (typia.assert performs complete type validation)
  typia.assert(snapshot);
  // 5. Verify business logic: snapshot links to correct cancellation request
  TestValidator.equals(
    "snapshot links to correct cancellation request",
    snapshot.shoppingMallCancellationRequestId,
    snapshot.cancellationRequest.id,
  );
  // 6. Verify business logic: cancellation request has valid status
  TestValidator.predicate(
    "cancellation request has valid status",
    ["pending", "approved", "rejected"].includes(
      snapshot.cancellationRequest.status,
    ),
  );
  // 7. Verify business logic: seller responded (snapshot created after response)
  TestValidator.predicate(
    "cancellation request has seller response",
    snapshot.cancellationRequest.seller !== null,
  );
  // 8. Verify business logic: respondedAt is populated
  TestValidator.predicate(
    "cancellation request has response timestamp",
    snapshot.cancellationRequest.respondedAt !== null,
  );
  // 9. Verify business logic: snapshotData contains valid JSON
  const parsedSnapshotData = JSON.parse(snapshot.snapshotData);
  TestValidator.predicate(
    "snapshot data is valid JSON object",
    typeof parsedSnapshotData === "object" && parsedSnapshotData !== null,
  );
  // 10. Verify business logic: customer information is present
  TestValidator.predicate(
    "cancellation request has customer",
    snapshot.cancellationRequest.customer.id.length > 0,
  );
  // 11. Verify business logic: order item information is present
  TestValidator.predicate(
    "cancellation request has order item",
    snapshot.cancellationRequest.orderItem.id.length > 0,
  );
  // 12. Verify business logic: order item has valid quantity
  TestValidator.predicate(
    "order item has valid quantity",
    snapshot.cancellationRequest.orderItem.quantity >= 1,
  );
  // 13. Verify business logic: order item has non-negative price
  TestValidator.predicate(
    "order item has non-negative price",
    snapshot.cancellationRequest.orderItem.price >= 0,
  );
}

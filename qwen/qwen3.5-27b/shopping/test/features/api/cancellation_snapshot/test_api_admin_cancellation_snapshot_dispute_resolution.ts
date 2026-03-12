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
 * Test that administrators can access cancellation snapshots for dispute resolution purposes.
 * Verifies snapshot data integrity, timestamp accuracy, and availability for compliance purposes.
 */
export async function test_api_admin_cancellation_snapshot_dispute_resolution(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
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
  // 2. Generate a valid cancellation snapshot ID for testing
  const cancellationSnapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the cancellation snapshot as admin
  const snapshot: IShoppingMallCancellationSnapshot =
    await api.functional.shoppingMall.admin.cancellationSnapshots.at(
      adminConnection,
      {
        cancellationSnapshotId,
      },
    );
  typia.assert(snapshot);
  // 4. Verify snapshot ID is valid UUID
  TestValidator.predicate(
    "snapshot has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      snapshot.id,
    ),
  );
  // 5. Verify cancellation request reference exists
  TestValidator.predicate(
    "snapshot has cancellation request reference",
    snapshot.shoppingMallCancellationRequestId !== undefined &&
      snapshot.shoppingMallCancellationRequestId !== null,
  );
  // 6. Verify snapshot data JSON is present and non-empty
  TestValidator.predicate(
    "snapshot data is present",
    snapshot.snapshotData !== undefined &&
      snapshot.snapshotData !== null &&
      snapshot.snapshotData.length > 0,
  );
  // 7. Verify snapshot data is valid JSON
  let parsedSnapshotData: object;
  try {
    parsedSnapshotData = JSON.parse(snapshot.snapshotData);
    TestValidator.predicate("snapshot data is valid JSON", true);
  } catch (error) {
    TestValidator.predicate("snapshot data is valid JSON", false);
  }
  // 8. Verify created_at timestamp is valid date-time format
  TestValidator.predicate(
    "snapshot has valid created_at timestamp",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T[01][0-9]:[0-5][0-9]:[0-5][0-9](\.[0-9]+)?(Z|[+-][01][0-9]:[0-5][0-9])$/i.test(
      snapshot.createdAt,
    ),
  );
  // 9. Verify cancellation request summary is present
  TestValidator.predicate(
    "cancellation request summary exists",
    snapshot.cancellationRequest !== undefined &&
      snapshot.cancellationRequest !== null,
  );
  // 10. Verify cancellation request has required fields
  TestValidator.predicate(
    "cancellation request has ID",
    snapshot.cancellationRequest.id !== undefined,
  );
  TestValidator.predicate(
    "cancellation request has reason",
    snapshot.cancellationRequest.reason !== undefined,
  );
  TestValidator.predicate(
    "cancellation request has status",
    snapshot.cancellationRequest.status !== undefined,
  );
  TestValidator.predicate(
    "cancellation request has requestedAt",
    snapshot.cancellationRequest.requestedAt !== undefined,
  );
  // 11. Verify customer reference in cancellation request
  TestValidator.predicate(
    "cancellation request has customer reference",
    snapshot.cancellationRequest.customer !== undefined &&
      snapshot.cancellationRequest.customer !== null,
  );
  // 12. Verify order item reference in cancellation request
  TestValidator.predicate(
    "cancellation request has order item reference",
    snapshot.cancellationRequest.orderItem !== undefined &&
      snapshot.cancellationRequest.orderItem !== null,
  );
  // 13. Verify seller reference (may be null if pending)
  TestValidator.predicate(
    "seller reference is properly handled (null or object)",
    snapshot.cancellationRequest.seller === null ||
      (snapshot.cancellationRequest.seller !== undefined &&
        snapshot.cancellationRequest.seller.id !== undefined),
  );
  // 14. Verify respondedAt is properly typed (null or date-time)
  TestValidator.predicate(
    "respondedAt is properly typed",
    snapshot.cancellationRequest.respondedAt === null ||
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T[01][0-9]:[0-5][0-9]:[0-5][0-9](\.[0-9]+)?(Z|[+-][01][0-9]:[0-5][0-9])$/i.test(
        snapshot.cancellationRequest.respondedAt,
      ),
  );
  // 15. Verify rejection reason is properly typed (null or string)
  TestValidator.predicate(
    "rejection reason is properly typed",
    snapshot.cancellationRequest.rejectionReason === null ||
      typeof snapshot.cancellationRequest.rejectionReason === "string",
  );
  // 16. Verify status is one of valid values
  const validStatuses = ["pending", "approved", "rejected"] as const;
  TestValidator.predicate(
    "cancellation request has valid status",
    validStatuses.includes(
      snapshot.cancellationRequest.status as (typeof validStatuses)[number],
    ),
  );
  // 17. Verify order item has required fields
  TestValidator.predicate(
    "order item has ID",
    snapshot.cancellationRequest.orderItem.id !== undefined,
  );
  TestValidator.predicate(
    "order item has order ID",
    snapshot.cancellationRequest.orderItem.orderId !== undefined,
  );
  TestValidator.predicate(
    "order item has status",
    snapshot.cancellationRequest.orderItem.status !== undefined,
  );
  TestValidator.predicate(
    "order item has quantity",
    snapshot.cancellationRequest.orderItem.quantity !== undefined,
  );
  TestValidator.predicate(
    "order item has price",
    snapshot.cancellationRequest.orderItem.price !== undefined,
  );
  // 18. Verify customer has required fields
  TestValidator.predicate(
    "customer has ID",
    snapshot.cancellationRequest.customer.id !== undefined,
  );
  TestValidator.predicate(
    "customer has email",
    snapshot.cancellationRequest.customer.email !== undefined,
  );
  TestValidator.predicate(
    "customer has display name",
    snapshot.cancellationRequest.customer.display_name !== undefined,
  );
  TestValidator.predicate(
    "customer has status",
    snapshot.cancellationRequest.customer.status !== undefined,
  );
  // 19. Verify snapshot preserves original customer reason
  TestValidator.predicate(
    "snapshot preserves customer reason",
    snapshot.cancellationRequest.reason.length > 0,
  );
  // 20. Verify chronological consistency: requestedAt <= respondedAt (if responded)
  if (snapshot.cancellationRequest.respondedAt !== null) {
    const requestedTime = new Date(
      snapshot.cancellationRequest.requestedAt,
    ).getTime();
    const respondedTime = new Date(
      snapshot.cancellationRequest.respondedAt,
    ).getTime();
    TestValidator.predicate(
      "respondedAt is after or equal to requestedAt",
      respondedTime >= requestedTime,
    );
  }
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequestSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator viewing complete history for a specific refund request.
 * Verify that:
 * 1. The index endpoint returns properly structured snapshot data
 * 2. Each snapshot preserves the reason and status at that moment in time
 * 3. Status values are valid (pending, approved, rejected)
 * 4. The audit trail shows timestamps allowing reconstruction of the complete timeline
 * 5. This supports dispute resolution by providing objective evidence of what occurred and when
 */
export async function test_api_refund_request_snapshot_history_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication for platform oversight access
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Query all snapshots to verify the endpoint works
  const allSnapshots =
    await api.functional.shoppingMall.administrator.refund_request_snapshots.index(
      adminConnection,
      {
        body: {} satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // 3. Verify pagination structure
  TestValidator.predicate(
    "pagination data exists",
    allSnapshots.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit exists",
    allSnapshots.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records exists",
    allSnapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages exists",
    allSnapshots.pagination.pages >= 0,
  );
  // 4. Verify each snapshot has required audit trail properties
  for (const snapshot of allSnapshots.data) {
    // Each snapshot has a unique identifier
    TestValidator.predicate(
      "snapshot has UUID id",
      typeof snapshot.id === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          snapshot.id,
        ),
    );
    // Each snapshot preserves reason at that moment
    TestValidator.predicate(
      "snapshot preserves reason text",
      typeof snapshot.reason === "string",
    );
    // Each snapshot preserves status at that moment
    TestValidator.predicate(
      "snapshot preserves valid status",
      ["pending", "approved", "rejected"].includes(snapshot.status),
    );
    // Each snapshot has timestamp for timeline reconstruction
    TestValidator.predicate(
      "snapshot has valid created_at timestamp",
      typeof snapshot.created_at === "string" &&
        !isNaN(new Date(snapshot.created_at).getTime()),
    );
    // Each snapshot has refundRequest reference
    TestValidator.predicate(
      "snapshot has refundRequest reference",
      snapshot.refundRequest !== null && snapshot.refundRequest !== undefined,
    );
  }
  // 5. Verify timeline ordering (descending by created_at)
  if (allSnapshots.data.length > 1) {
    for (let i = 1; i < allSnapshots.data.length; i++) {
      const prevTime = new Date(allSnapshots.data[i - 1].created_at).getTime();
      const currTime = new Date(allSnapshots.data[i].created_at).getTime();
      TestValidator.predicate(
        "timestamps allow timeline reconstruction (descending order)",
        prevTime >= currTime,
      );
    }
  }
  // 6. Test filtering by status when snapshots exist
  if (allSnapshots.data.length > 0) {
    const statuses = ["pending", "approved", "rejected"] as const;
    for (const status of statuses) {
      const filteredByStatus =
        await api.functional.shoppingMall.administrator.refund_request_snapshots.index(
          adminConnection,
          {
            body: {
              status,
            } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
          },
        );
      typia.assert(filteredByStatus);
      // Verify all returned snapshots have the filtered status
      TestValidator.predicate(
        `all filtered snapshots have status '${status}'`,
        filteredByStatus.data.every((snapshot) => snapshot.status === status),
      );
    }
  }
}

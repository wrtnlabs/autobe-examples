import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDateRange";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_cancellation_request_snapshot_index(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register administrator
  const adminAuth = await authorize_administrator_join(connection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular",
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // Step 2: Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = {
    Authorization: adminAuth.token.access,
  };
  // Step 3: Call snapshot index endpoint with empty filter
  const snapshots =
    await api.functional.ecommerceMall.administrator.cancellation_request_snapshots.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // Step 4: Validate pagination
  TestValidator.equals("current page is 1", snapshots.pagination.current, 1);
  TestValidator.predicate(
    "pagination limit is positive",
    snapshots.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages matches records/limit",
    snapshots.pagination.pages ===
      Math.ceil(snapshots.pagination.records / snapshots.pagination.limit),
  );
  // Step 5: Validate snapshot data structure (if any snapshots exist)
  if (snapshots.data.length > 0) {
    for (const snapshot of snapshots.data) {
      // Validate required fields exist
      typia.assert(snapshot);
      // Validate actor_type is always customer
      TestValidator.equals(
        "actor type is customer",
        snapshot.actor_type,
        "customer",
      );
      // Validate timestamp formats - created_at is always present
      typia.assert(snapshot.created_at);
      // Validate approved_at and rejected_at are mutually exclusive
      if (snapshot.approved_at !== null && snapshot.rejected_at !== null) {
        throw new Error(
          "Snapshot cannot have both approved_at and rejected_at set",
        );
      }
      // Validate seller_rejection_reason only when rejected
      if (snapshot.rejected_at !== null) {
        // Rejection reason should be populated for rejected requests
        TestValidator.predicate(
          "rejection reason exists when rejected",
          snapshot.seller_rejection_reason !== null &&
            snapshot.seller_rejection_reason !== undefined &&
            snapshot.seller_rejection_reason.length > 0,
        );
      }
      // Validate cancellationRequest reference
      typia.assert(snapshot.cancellationRequest);
      TestValidator.predicate(
        "cancellation request has item",
        snapshot.cancellationRequest.item !== undefined,
      );
      TestValidator.predicate(
        "cancellation request has order",
        snapshot.cancellationRequest.order !== undefined,
      );
      TestValidator.predicate(
        "cancellation request has seller",
        snapshot.cancellationRequest.seller !== undefined,
      );
    }
    // Step 6: Verify snapshots are sorted by created_at descending (newest first)
    if (snapshots.data.length > 1) {
      for (let i = 0; i < snapshots.data.length - 1; i++) {
        const current = snapshots.data[i];
        const next = snapshots.data[i + 1];
        TestValidator.predicate(
          `snapshots sorted by created_at descending (index ${i})`,
          new Date(current.created_at) >= new Date(next.created_at),
        );
      }
    }
  } else {
    // Empty result case
    TestValidator.equals(
      "empty pagination records",
      snapshots.pagination.records,
      0,
    );
    TestValidator.equals(
      "empty pagination pages",
      snapshots.pagination.pages,
      0,
    );
  }
}

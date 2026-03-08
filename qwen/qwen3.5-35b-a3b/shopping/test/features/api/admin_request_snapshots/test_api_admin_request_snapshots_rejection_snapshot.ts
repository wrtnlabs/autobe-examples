import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_request_snapshots_rejection_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
    href: "https://admin.test.com/join",
    referrer: "https://admin.test.com",
  } satisfies IEcommerceMallAdmin.IJoin;
  const adminAuth = await api.functional.ecommerceMall.auth.admin.join(
    adminConnection,
    { body: adminCredentials },
  );
  typia.assert(adminAuth);
  // Create new connection with admin token for authenticated requests
  const adminAuthorizedConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminAuthorizedConnection, {
    body: adminCredentials,
  });
  // 2. Generate test data: admin request ID (simulating an existing request)
  const adminRequestId = typia.random<string & tags.Format<"uuid">>();
  // 3. Generate rejection reason for the snapshot
  const rejectionReason = typia.random<string & tags.MaxLength<500>>();
  // 4. Call the target endpoint to retrieve snapshots for the admin request
  const snapshotResponse: IPageIEcommerceMallAdminRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.admin.admin_requests.snapshots.listSnapshots(
      adminAuthorizedConnection,
      {
        adminRequestId,
      },
    );
  typia.assert(snapshotResponse);
  // 5. Validate pagination metadata
  TestValidator.predicate("has valid pagination", () => {
    const pagination = snapshotResponse.pagination;
    return (
      pagination.current >= 0 &&
      pagination.limit >= 0 &&
      pagination.records >= 0 &&
      pagination.pages >= 0
    );
  });
  // 6. Validate snapshot count matches pagination records
  TestValidator.equals(
    "snapshot count matches pagination records",
    snapshotResponse.data.length,
    snapshotResponse.pagination.records,
  );
  // 7. Validate each snapshot has immutable structure
  for (const snapshot of snapshotResponse.data) {
    typia.assert(snapshot);
    // Validate snapshot has valid UUID id
    TestValidator.predicate("snapshot id is valid UUID", () =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.id,
      ),
    );
    // Validate reason field exists and is a string
    TestValidator.equals(
      "snapshot has reason",
      typeof snapshot.reason,
      "string",
    );
    // Validate request status is one of the allowed values
    TestValidator.equals(
      "snapshot has valid requestStatus",
      snapshot.requestStatus,
      snapshot.requestStatus,
    );
    // Validate timestamps are ISO 8601 date-time format
    TestValidator.predicate(
      "snapshot created_at is valid date-time",
      () => !isNaN(Date.parse(snapshot.createdAt)),
    );
    TestValidator.predicate(
      "snapshot changed_at is valid date-time",
      () => !isNaN(Date.parse(snapshot.changedAt)),
    );
    // Validate changedByAdmin structure if present
    if (
      snapshot.changedByAdmin !== null &&
      snapshot.changedByAdmin !== undefined
    ) {
      typia.assert(snapshot.changedByAdmin);
      // changedByAdmin should have admin identity fields
      TestValidator.equals(
        "changedByAdmin has id",
        typeof snapshot.changedByAdmin.id,
        "string",
      );
      TestValidator.equals(
        "changedByAdmin has email",
        typeof snapshot.changedByAdmin.email,
        "string",
      );
      TestValidator.equals(
        "changedByAdmin has is_banned",
        typeof snapshot.changedByAdmin.is_banned,
        "boolean",
      );
      TestValidator.equals(
        "changedByAdmin has created_at",
        typeof snapshot.changedByAdmin.created_at,
        "string",
      );
      TestValidator.equals(
        "changedByAdmin has updated_at",
        typeof snapshot.changedByAdmin.updated_at,
        "string",
      );
    }
  }
}

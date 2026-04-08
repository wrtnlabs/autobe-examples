import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministratorApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorApprovalRequestSnapshot";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_approval_request_snapshot_retrieve_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_super_administrator_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        display_name: RandomGenerator.name(2),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
      } satisfies IEcommerceMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(adminResult);
  // 2. Attempt to retrieve a snapshot (using random UUID since no API to create approval requests)
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const snapshot =
    await api.functional.ecommerceMall.superAdministrator.administrator_approval_request_snapshots.at(
      adminConnection,
      {
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 3. Validate snapshot structure and field constraints
  // Validate id is a valid UUID format
  TestValidator.predicate(
    "id is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      snapshot.id,
    ),
  );
  // Validate approval request reference is a valid UUID
  TestValidator.predicate(
    "approval request id is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      snapshot.ecommerceMallAdministratorApprovalRequestId,
    ),
  );
  // Validate reviewer can be null (when pending) or valid UUID (when approved/rejected)
  TestValidator.predicate(
    "reviewer id is nullable or valid UUID",
    snapshot.reviewedByAdministratorId === null ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.reviewedByAdministratorId,
      ),
  );
  // Validate requester id is a valid UUID
  TestValidator.predicate(
    "requester id is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      snapshot.requesterId,
    ),
  );
  // Validate requester type is one of the allowed values
  TestValidator.predicate(
    "requester type is valid (member or seller)",
    snapshot.requesterType === "member" || snapshot.requesterType === "seller",
  );
  // Validate request reason is a non-empty string
  TestValidator.predicate(
    "request reason is non-empty string",
    typeof snapshot.requestReason === "string" &&
      snapshot.requestReason.length > 0,
  );
  // Validate status is one of the allowed values
  TestValidator.predicate(
    "status is valid (pending, approved, or rejected)",
    snapshot.status === "pending" ||
      snapshot.status === "approved" ||
      snapshot.status === "rejected",
  );
  // Validate approved grade is nullable or one of the allowed values
  TestValidator.predicate(
    "approved grade is nullable or valid (regular or super)",
    snapshot.approvedGrade === null ||
      snapshot.approvedGrade === "regular" ||
      snapshot.approvedGrade === "super",
  );
  // Validate review reason is nullable or non-empty string
  TestValidator.predicate(
    "review reason is nullable or non-empty string",
    snapshot.reviewReason === null ||
      (typeof snapshot.reviewReason === "string" &&
        snapshot.reviewReason.length > 0),
  );
  // Validate created at is valid ISO 8601 timestamp
  TestValidator.predicate(
    "created at is valid ISO 8601 timestamp",
    !isNaN(Date.parse(snapshot.createdAt)),
  );
  // For rejected snapshots, validate rejection-specific fields are present
  if (snapshot.status === "rejected") {
    TestValidator.predicate(
      "rejected snapshot has reviewer id set",
      snapshot.reviewedByAdministratorId !== null,
    );
    TestValidator.predicate(
      "rejected snapshot has review reason set",
      snapshot.reviewReason !== null,
    );
    TestValidator.equals(
      "rejected snapshot has no approved grade",
      snapshot.approvedGrade,
      null,
    );
  }
}

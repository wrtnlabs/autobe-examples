import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTimesheetSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheetSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test retrieving timesheet snapshots and validating response structure.
 * Verifies that the snapshot retrieval endpoint returns properly structured
 * data with all required fields and correct type validation.
 */
export async function test_api_timesheet_snapshot_retrieve_by_status(
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
    },
  });
  // 2. Generate a snapshot ID for retrieval test
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Test error handling for non-existent snapshot
  await TestValidator.error("non-existent snapshot throws error", async () => {
    await api.functional.hrmPlatform.admin.timesheet_snapshots.at(
      adminConnection,
      { snapshotId },
    );
  });
  // 4. Test with simulate mode to validate response structure
  const simulateConnection: api.IConnection = {
    ...adminConnection,
    simulate: true,
  };
  const snapshot =
    await api.functional.hrmPlatform.admin.timesheet_snapshots.at(
      simulateConnection,
      { snapshotId },
    );
  typia.assert(snapshot);
  // 5. Validate business logic - snapshot structure and status values
  TestValidator.predicate(
    "snapshot has valid status value",
    ["pending", "submitted", "approved", "rejected"].includes(snapshot.status),
  );
  // 6. Validate status-specific field relationships
  if (snapshot.status === "submitted") {
    TestValidator.predicate(
      "submitted status has submitted_at",
      snapshot.submitted_at !== null,
    );
    TestValidator.equals(
      "submitted status has null approved_at",
      snapshot.approved_at,
      null,
    );
    TestValidator.equals(
      "submitted status has null rejected_at",
      snapshot.rejected_at,
      null,
    );
  } else if (snapshot.status === "approved") {
    TestValidator.predicate(
      "approved status has submitted_at",
      snapshot.submitted_at !== null,
    );
    TestValidator.predicate(
      "approved status has approved_at",
      snapshot.approved_at !== null,
    );
    TestValidator.predicate(
      "approved status has approver",
      snapshot.approver !== null,
    );
    TestValidator.equals(
      "approved status has null rejected_at",
      snapshot.rejected_at,
      null,
    );
  } else if (snapshot.status === "rejected") {
    TestValidator.predicate(
      "rejected status has submitted_at",
      snapshot.submitted_at !== null,
    );
    TestValidator.predicate(
      "rejected status has rejected_at",
      snapshot.rejected_at !== null,
    );
    TestValidator.predicate(
      "rejected status has rejectedBy",
      snapshot.rejectedBy !== null,
    );
    TestValidator.predicate(
      "rejected status has rejection_reason",
      snapshot.rejection_reason !== null,
    );
  }
  // 7. Validate common fields exist
  TestValidator.predicate(
    "snapshot has employee information",
    snapshot.employee !== null,
  );
  TestValidator.predicate(
    "snapshot has week_start_date",
    snapshot.week_start_date !== null,
  );
  TestValidator.predicate(
    "snapshot has total_hours",
    snapshot.total_hours >= 0,
  );
  TestValidator.predicate(
    "snapshot has created_at",
    snapshot.created_at !== null,
  );
}

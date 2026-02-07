import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test the super administrator dashboard's ability to retrieve comprehensive ban appeal statistics.
 * The test should verify that the dashboard correctly displays counts of appeals by status
 * (pending, under_review, approved, rejected), calculates average appeal processing times,
 * shows recent appeal activity timelines, and provides workload distribution metrics.
 */
export async function test_api_super_admin_dashboard_appeal_statistics(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Retrieve ban appeal statistics from dashboard
  const statistics =
    await api.functional.discussionBoard.superAdmin.dashboard.appeal.dashboard(
      superAdminConnection,
    );
  // Validate the response structure - typia.assert performs complete validation
  typia.assert(statistics);
  // The dashboard returns a single ban appeal record with comprehensive information
  // Validate that the record contains meaningful data for administrative oversight
  TestValidator.predicate(
    "appeal has valid status",
    statistics.status === "pending" ||
      statistics.status === "under_review" ||
      statistics.status === "approved" ||
      statistics.status === "rejected",
  );
  TestValidator.predicate(
    "appeal has appeal reason",
    statistics.appeal_reason.length > 0,
  );
  TestValidator.predicate(
    "appeal has valid appealed_at timestamp",
    new Date(statistics.appealed_at).getTime() > 0,
  );
  // Validate ban record completeness
  TestValidator.predicate(
    "ban record has valid status",
    statistics.banRecord.ban_status === "active" ||
      statistics.banRecord.ban_status === "expired" ||
      statistics.banRecord.ban_status === "revoked",
  );
  TestValidator.predicate(
    "ban record has ban reason",
    statistics.banRecord.ban_reason.length > 0,
  );
  // Validate user summary completeness
  TestValidator.predicate(
    "user has display name",
    statistics.user.display_name.length > 0,
  );
  TestValidator.predicate(
    "user has valid created_at timestamp",
    new Date(statistics.user.created_at).getTime() > 0,
  );
  // Validate timestamp relationships
  TestValidator.predicate(
    "appealed_at is after user creation",
    new Date(statistics.appealed_at) >= new Date(statistics.user.created_at),
  );
  // If appeal has been reviewed, validate review timestamps
  if (statistics.reviewed_at !== null) {
    TestValidator.predicate(
      "reviewed_at is after appealed_at",
      new Date(statistics.reviewed_at) >= new Date(statistics.appealed_at),
    );
    TestValidator.predicate(
      "reviewer exists when reviewed",
      statistics.reviewer !== null,
    );
  }
  // If appeal has decision reason, validate it's not empty
  if (statistics.decision_reason !== null) {
    TestValidator.predicate(
      "decision reason not empty",
      statistics.decision_reason.length > 0,
    );
  }
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_governance_oversight_basic_metrics(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super admin using utility function
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Call governance oversight endpoint
  const oversightData =
    await api.functional.discussionBoard.superAdmin.governance.oversight.invert(
      superAdminConnection,
    );
  typia.assert(oversightData);
  // Validate administrator counts
  TestValidator.predicate(
    "regular_admins should be non-negative",
    oversightData.administrator_counts.regular_admins >= 0,
  );
  TestValidator.predicate(
    "super_admins should be non-negative",
    oversightData.administrator_counts.super_admins >= 0,
  );
  TestValidator.predicate(
    "total_admins should be non-negative",
    oversightData.administrator_counts.total_admins >= 0,
  );
  TestValidator.equals(
    "total_admins should equal regular_admins + super_admins",
    oversightData.administrator_counts.total_admins,
    oversightData.administrator_counts.regular_admins +
      oversightData.administrator_counts.super_admins,
  );
  // Validate action statistics
  for (const [actionType, count] of Object.entries(
    oversightData.action_statistics,
  )) {
    TestValidator.predicate(
      `action_statistics.${actionType} should be non-negative`,
      count >= 0,
    );
  }
  // Validate ban patterns
  TestValidator.predicate(
    "active_bans should be non-negative",
    oversightData.ban_patterns.active_bans >= 0,
  );
  TestValidator.predicate(
    "recent_bans should be non-negative",
    oversightData.ban_patterns.recent_bans >= 0,
  );
  for (const [reason, count] of Object.entries(
    oversightData.ban_patterns.ban_reasons,
  )) {
    TestValidator.predicate(
      `ban_reasons.${reason} should be non-negative`,
      count >= 0,
    );
  }
  // Validate governance decisions
  TestValidator.predicate(
    "approval_rate should be between 0 and 1",
    oversightData.governance_decisions.approval_rate >= 0 &&
      oversightData.governance_decisions.approval_rate <= 1,
  );
  TestValidator.predicate(
    "rejection_rate should be between 0 and 1",
    oversightData.governance_decisions.rejection_rate >= 0 &&
      oversightData.governance_decisions.rejection_rate <= 1,
  );
  TestValidator.predicate(
    "approval_rate + rejection_rate should be <= 1",
    oversightData.governance_decisions.approval_rate +
      oversightData.governance_decisions.rejection_rate <=
      1,
  );
  TestValidator.predicate(
    "average_response_time should be non-negative",
    oversightData.governance_decisions.average_response_time >= 0,
  );
}

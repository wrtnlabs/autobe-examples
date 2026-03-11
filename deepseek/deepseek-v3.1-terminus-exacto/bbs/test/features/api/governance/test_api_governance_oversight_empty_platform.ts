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

export async function test_api_governance_oversight_empty_platform(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Call governance oversight endpoint
  const oversight =
    await api.functional.discussionBoard.superAdmin.governance.oversight.invert(
      superAdminConnection,
    );
  typia.assert(oversight);
  // Validate administrator counts
  TestValidator.equals(
    "should have exactly 1 super admin",
    oversight.administrator_counts.super_admins,
    1,
  );
  TestValidator.equals(
    "should have 0 regular admins",
    oversight.administrator_counts.regular_admins,
    0,
  );
  TestValidator.equals(
    "total admins should be 1",
    oversight.administrator_counts.total_admins,
    1,
  );
  // Validate ban patterns
  TestValidator.equals(
    "should have 0 active bans",
    oversight.ban_patterns.active_bans,
    0,
  );
  TestValidator.equals(
    "should have 0 recent bans",
    oversight.ban_patterns.recent_bans,
    0,
  );
  // Validate action statistics exists (typia.assert already validated the type)
  TestValidator.predicate(
    "action_statistics should be an object",
    typeof oversight.action_statistics === "object" &&
      oversight.action_statistics !== null,
  );
  // Validate governance decisions structure (typia.assert already validated the types)
  TestValidator.predicate(
    "approval rate should be non-negative",
    oversight.governance_decisions.approval_rate >= 0,
  );
  TestValidator.predicate(
    "rejection rate should be non-negative",
    oversight.governance_decisions.rejection_rate >= 0,
  );
  TestValidator.predicate(
    "average response time should be non-negative",
    oversight.governance_decisions.average_response_time >= 0,
  );
}

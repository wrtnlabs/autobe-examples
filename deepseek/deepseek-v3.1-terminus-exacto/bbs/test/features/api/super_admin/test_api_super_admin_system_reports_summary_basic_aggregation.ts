import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
 * Test that a super administrator can retrieve a comprehensive system summary report
 * with aggregated data from all statistical sources.
 */
export async function test_api_super_admin_system_reports_summary_basic_aggregation(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Call the system reports summary endpoint with no filters to get complete overview
  const summary =
    await api.functional.discussionBoard.superAdmin.system.reports.summary.search(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(summary);
  // Validate the comprehensive audit log structure contains aggregated metrics
  TestValidator.predicate("has valid UUID id", summary.id !== undefined);
  TestValidator.predicate("has actor type", summary.actor_type !== undefined);
  TestValidator.predicate("has action type", summary.action_type !== undefined);
  TestValidator.predicate("has description", summary.description.length > 0);
  TestValidator.predicate(
    "has success status",
    typeof summary.success === "boolean",
  );
  TestValidator.predicate(
    "has valid created at timestamp",
    summary.created_at !== undefined,
  );
  TestValidator.predicate(
    "has valid updated at timestamp",
    summary.updated_at !== undefined,
  );
  // Validate optional fields that may be present in system summary
  if (summary.action_subtype !== undefined) {
    TestValidator.predicate(
      "action subtype is string",
      typeof summary.action_subtype === "string",
    );
  }
  if (summary.ip_address !== undefined) {
    TestValidator.predicate(
      "ip address is string or null",
      summary.ip_address === null || typeof summary.ip_address === "string",
    );
  }
  if (summary.user_agent !== undefined) {
    TestValidator.predicate(
      "user agent is string or null",
      summary.user_agent === null || typeof summary.user_agent === "string",
    );
  }
  if (summary.metadata !== undefined) {
    TestValidator.predicate(
      "metadata is string or null",
      summary.metadata === null || typeof summary.metadata === "string",
    );
  }
  if (summary.error_message !== undefined) {
    TestValidator.predicate(
      "error message is string or null",
      summary.error_message === null ||
        typeof summary.error_message === "string",
    );
  }
  // Validate that the system summary represents aggregated platform performance data
  TestValidator.predicate(
    "description contains system summary context",
    summary.description.toLowerCase().includes("system") ||
      summary.description.toLowerCase().includes("summary") ||
      summary.description.toLowerCase().includes("aggregat"),
  );
}

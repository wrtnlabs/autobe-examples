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
 * Test response behavior when filters result in empty or minimal data.
 * Authenticate as superAdmin via join endpoint, then call the system reports summary endpoint
 * with extremely narrow filters (e.g., very specific date range with no activity or non-existent
 * target IDs). Verify the system returns a valid summary structure with zero or minimal aggregated
 * values rather than errors.
 */
export async function test_api_super_admin_system_reports_summary_empty_results_narrow_filter(
  connection: api.IConnection,
): Promise<IDiscussionBoardAuditLog> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create comprehensive narrow filter combination that should yield minimal data
  const emptyResults =
    await api.functional.discussionBoard.superAdmin.system.reports.summary.search(
      superAdminConnection,
      {
        body: {
          // Target non-existent entities
          target_article_id: typia.random<string & tags.Format<"uuid">>(),
          target_comment_id: typia.random<string & tags.Format<"uuid">>(),
          target_section_id: typia.random<string & tags.Format<"uuid">>(),
          target_user_id: typia.random<string & tags.Format<"uuid">>(),
          // Very narrow date range with no activity
          created_at_start: new Date("2025-01-01T00:00:00.000Z").toISOString(),
          created_at_end: new Date("2025-01-01T00:00:00.001Z").toISOString(),
          // Specific actor type
          actor_type: "user",
          // Specific action type
          action_type: "article_create",
          // Success filter
          success: true,
          // Non-matching search term
          search_term: "nonexistent_unique_search_term_xyz123",
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(emptyResults);
  return emptyResults;
}

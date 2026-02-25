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

export async function test_api_super_admin_system_reports_summary_filtered_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super admin
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Define date ranges for testing
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  // Test 1: Filter by last 24 hours
  const recentSummary =
    await api.functional.discussionBoard.superAdmin.system.reports.summary.search(
      superAdminConnection,
      {
        body: {
          created_at_start: yesterday.toISOString(),
          created_at_end: now.toISOString(),
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(recentSummary);
  // Test 2: Filter by last 30 days
  const broaderSummary =
    await api.functional.discussionBoard.superAdmin.system.reports.summary.search(
      superAdminConnection,
      {
        body: {
          created_at_start: thirtyDaysAgo.toISOString(),
          created_at_end: now.toISOString(),
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(broaderSummary);
  // Validate that responses contain summary data structure
  TestValidator.predicate(
    "recent summary has valid ID",
    recentSummary.id !== undefined,
  );
  TestValidator.predicate(
    "broader summary has valid ID",
    broaderSummary.id !== undefined,
  );
  // Validate that different date ranges produce different summaries
  TestValidator.notEquals(
    "summaries should differ by date range",
    recentSummary.id,
    broaderSummary.id,
  );
}

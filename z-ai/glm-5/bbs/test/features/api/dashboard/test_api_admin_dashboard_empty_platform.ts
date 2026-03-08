import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDashboardSummary";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_dashboard_empty_platform(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator using the join endpoint
  await authorize_admin_join(adminConnection, {});
  // Retrieve dashboard summary on a fresh/empty platform
  const dashboard: IDashboardSummary =
    await api.functional.discussionBoard.admin.dashboard.at(adminConnection);
  typia.assert(dashboard);
  // Validate article statistics (should all be zero on empty platform)
  TestValidator.equals(
    "articles_total should be 0",
    dashboard.articles_total,
    0,
  );
  TestValidator.equals(
    "articles_recent should be 0",
    dashboard.articles_recent,
    0,
  );
  TestValidator.equals(
    "comments_total should be 0",
    dashboard.comments_total,
    0,
  );
  TestValidator.equals(
    "comments_averagePerArticle should be 0",
    dashboard.comments_averagePerArticle,
    0,
  );
  // Validate articles_bySection is empty array when no articles exist
  TestValidator.equals(
    "articles_bySection should be empty array",
    dashboard.articles_bySection.length,
    0,
  );
  // Validate member statistics
  // members_total should be at least 1 (the admin we just created)
  TestValidator.predicate(
    "members_total should be >= 1",
    dashboard.members_total >= 1,
  );
  // members_active should be at least 1 (the admin we just created)
  TestValidator.predicate(
    "members_active should be >= 1",
    dashboard.members_active >= 1,
  );
  // members_banned should be 0
  TestValidator.equals(
    "members_banned should be 0",
    dashboard.members_banned,
    0,
  );
  // members_recent should be at least 1 (the admin we just created)
  TestValidator.predicate(
    "members_recent should be >= 1",
    dashboard.members_recent >= 1,
  );
  // Validate section statistics
  TestValidator.predicate(
    "sections_total should be >= 0",
    dashboard.sections_total >= 0,
  );
  // CRITICAL: sections_mostActive must be null when no articles exist
  TestValidator.equals(
    "sections_mostActive should be null when no articles exist",
    dashboard.sections_mostActive,
    null,
  );
  // Validate admin request statistics (should all be 0 on fresh platform)
  TestValidator.equals(
    "adminRequests_pending should be 0",
    dashboard.adminRequests_pending,
    0,
  );
  TestValidator.equals(
    "adminRequests_approved should be 0",
    dashboard.adminRequests_approved,
    0,
  );
  TestValidator.equals(
    "adminRequests_rejected should be 0",
    dashboard.adminRequests_rejected,
    0,
  );
}

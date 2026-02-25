import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_moderator_dashboard_stats_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerInfo = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      username: RandomGenerator.name(),
      displayName: "Owner User",
    } satisfies IRedditCloneOwner.IJoin,
  });
  typia.assert(ownerInfo);
  // 2. Access moderator analytics dashboard
  const dashboardStats =
    await api.functional.redditClone.owner.analytics.moderator.dashboard.analytics(
      ownerConnection,
    );
  typia.assert(dashboardStats);
  // 3. Validate dashboard stats structure
  TestValidator.predicate(
    "daily active moderators is non-negative",
    dashboardStats.dailyActiveModerators >= 0,
  );
  TestValidator.predicate(
    "posts moderated is non-negative",
    dashboardStats.postsModerated >= 0,
  );
  TestValidator.predicate(
    "comments moderated is non-negative",
    dashboardStats.commentsModerated >= 0,
  );
  TestValidator.predicate(
    "bans issued is non-negative",
    dashboardStats.bansIssued >= 0,
  );
  TestValidator.predicate(
    "bans lifted is non-negative",
    dashboardStats.bansLifted >= 0,
  );
  TestValidator.predicate(
    "pending reports is non-negative",
    dashboardStats.pendingReports >= 0,
  );
  TestValidator.predicate(
    "resolved reports is non-negative",
    dashboardStats.resolvedReports >= 0,
  );
  TestValidator.predicate(
    "approval rate is between 0 and 100",
    dashboardStats.approvalRate >= 0 && dashboardStats.approvalRate <= 100,
  );
}

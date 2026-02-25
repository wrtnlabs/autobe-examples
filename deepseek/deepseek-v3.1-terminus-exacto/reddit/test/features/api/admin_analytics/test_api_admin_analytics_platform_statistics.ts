import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSystemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSystemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSystemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_analytics_platform_statistics(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Retrieve platform analytics
  const analytics =
    await api.functional.communityPlatform.admin.analytics.index(
      adminConnection,
    );
  typia.assert(analytics);
  // Validate pagination structure - business logic validation
  TestValidator.predicate(
    "current page non-negative",
    analytics.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit non-negative",
    analytics.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "total records non-negative",
    analytics.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages non-negative",
    analytics.pagination.pages >= 0,
  );
  // Validate data array structure
  TestValidator.predicate("data is array", Array.isArray(analytics.data));
  if (analytics.data.length > 0) {
    const snapshot = analytics.data[0];
    // Validate business logic constraints
    TestValidator.predicate(
      "active users <= total users",
      snapshot.active_users_24h <= snapshot.total_users,
    );
    TestValidator.predicate(
      "24h posts <= total posts",
      snapshot.posts_24h <= snapshot.total_posts,
    );
    TestValidator.predicate(
      "24h comments <= total comments",
      snapshot.comments_24h <= snapshot.total_comments,
    );
    TestValidator.predicate(
      "24h votes <= total votes",
      snapshot.votes_24h <= snapshot.total_votes,
    );
    TestValidator.predicate(
      "engagement rate valid",
      snapshot.engagement_rate >= 0 && snapshot.engagement_rate <= 1,
    );
  }
}

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

export async function test_api_admin_analytics_temporal_comprehensive(
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
  // Retrieve analytics data - using SDK directly since no utility function provided
  const analytics =
    await api.functional.communityPlatform.admin.analytics.index(
      adminConnection,
    );
  typia.assert(analytics);
  // Validate pagination business logic (not type validation)
  TestValidator.predicate(
    "current page non-negative",
    analytics.pagination.current >= 0,
  );
  TestValidator.predicate("limit positive", analytics.pagination.limit > 0);
  TestValidator.predicate(
    "records non-negative",
    analytics.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages non-negative",
    analytics.pagination.pages >= 0,
  );
  if (analytics.data.length > 0) {
    // Test chronological ordering - newer snapshots should have later created_at timestamps
    const sortedSnapshots = [...analytics.data].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    TestValidator.equals(
      "snapshots are chronologically ordered",
      analytics.data,
      sortedSnapshots,
    );
    // Validate each snapshot's business logic
    for (const snapshot of analytics.data) {
      typia.assert(snapshot);
      // Validate engagement rate business logic
      if (snapshot.total_users > 0) {
        TestValidator.predicate(
          "engagement rate reasonable when users exist",
          snapshot.engagement_rate >= 0 && snapshot.engagement_rate <= 1,
        );
        TestValidator.predicate(
          "engagement rate reflects user activity",
          snapshot.active_users_24h <= snapshot.total_users,
        );
      } else {
        TestValidator.equals(
          "engagement rate zero when no users",
          snapshot.engagement_rate,
          0,
        );
      }
      // Validate metric relationships (business logic)
      TestValidator.predicate(
        "24h activity <= total activity for users",
        snapshot.active_users_24h <= snapshot.total_users,
      );
      TestValidator.predicate(
        "24h activity <= total activity for posts",
        snapshot.posts_24h <= snapshot.total_posts,
      );
      TestValidator.predicate(
        "24h activity <= total activity for comments",
        snapshot.comments_24h <= snapshot.total_comments,
      );
      TestValidator.predicate(
        "24h activity <= total activity for votes",
        snapshot.votes_24h <= snapshot.total_votes,
      );
      // Validate non-negative metrics (business constraints)
      TestValidator.predicate(
        "total users non-negative",
        snapshot.total_users >= 0,
      );
      TestValidator.predicate(
        "active users 24h non-negative",
        snapshot.active_users_24h >= 0,
      );
      TestValidator.predicate(
        "total posts non-negative",
        snapshot.total_posts >= 0,
      );
      TestValidator.predicate(
        "posts 24h non-negative",
        snapshot.posts_24h >= 0,
      );
      TestValidator.predicate(
        "total comments non-negative",
        snapshot.total_comments >= 0,
      );
      TestValidator.predicate(
        "comments 24h non-negative",
        snapshot.comments_24h >= 0,
      );
      TestValidator.predicate(
        "total votes non-negative",
        snapshot.total_votes >= 0,
      );
      TestValidator.predicate(
        "votes 24h non-negative",
        snapshot.votes_24h >= 0,
      );
      TestValidator.predicate(
        "engagement rate valid range",
        snapshot.engagement_rate >= 0 && snapshot.engagement_rate <= 1,
      );
    }
  }
}

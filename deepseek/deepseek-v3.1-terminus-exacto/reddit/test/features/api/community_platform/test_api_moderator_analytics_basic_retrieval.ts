import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformSystemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSystemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSystemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_analytics_basic_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator-specific connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // Call analytics endpoint with default parameters
  const response =
    await api.functional.communityPlatform.moderator.analytics.index(
      moderatorConnection,
      {
        body: {} satisfies ICommunityPlatformSystemSnapshot.IRequest,
      },
    );
  typia.assert(response);
  // Validate pagination calculations
  TestValidator.predicate(
    "pagination calculations are correct",
    response.pagination.pages ===
      Math.ceil(response.pagination.records / response.pagination.limit) ||
      response.pagination.records === 0,
  );
  // Validate data array structure
  TestValidator.equals("data is array", Array.isArray(response.data), true);
  // If there are records, validate business logic
  if (response.data.length > 0) {
    const snapshot = response.data[0];
    // Validate engagement rate calculation
    if (snapshot.total_users > 0) {
      const expectedEngagementRate =
        (snapshot.active_users_24h / snapshot.total_users) * 100;
      TestValidator.predicate(
        "engagement rate is calculated correctly",
        Math.abs(snapshot.engagement_rate - expectedEngagementRate) < 0.01,
      );
    }
    // Validate that 24-hour metrics are reasonable compared to total metrics
    TestValidator.predicate(
      "active users 24h <= total users",
      snapshot.active_users_24h <= snapshot.total_users,
    );
    TestValidator.predicate(
      "posts 24h <= total posts",
      snapshot.posts_24h <= snapshot.total_posts,
    );
    TestValidator.predicate(
      "comments 24h <= total comments",
      snapshot.comments_24h <= snapshot.total_comments,
    );
    TestValidator.predicate(
      "votes 24h <= total votes",
      snapshot.votes_24h <= snapshot.total_votes,
    );
  }
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_new_posts_analytics_guest_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session for authentication
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      session_token: typia.random<string & tags.Format<"uuid">>(),
      device_id: typia.random<string & tags.Format<"uuid">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      referrer: null,
    } satisfies IRedditCloneGuest.IJoin,
  });
  // 2. Fetch new posts analytics data
  const analytics =
    await api.functional.redditClone.guest.analytics.posts._new.newPostsAnalytics(
      guestConnection,
    );
  typia.assert(analytics);
  // 3. Validate response structure
  TestValidator.equals("type is 'new'", analytics.type, "new");
  TestValidator.predicate("has valid period", analytics.period !== undefined);
  TestValidator.predicate(
    "totalPosts is non-negative",
    analytics.totalPosts >= 0,
  );
  TestValidator.predicate(
    "postsByCommunity is array",
    Array.isArray(analytics.postsByCommunity),
  );
  TestValidator.predicate(
    "creationRate exists",
    analytics.creationRate !== undefined,
  );
  TestValidator.predicate("trends exists", analytics.trends !== undefined);
  // 4. Validate community post counts structure
  for (const community of analytics.postsByCommunity) {
    TestValidator.equals(
      "communityId exists",
      community.communityId !== undefined && community.communityId !== null,
      true,
    );
    TestValidator.equals(
      "communityName exists",
      community.communityName !== undefined && community.communityName !== null,
      true,
    );
    TestValidator.predicate(
      "postCount is non-negative",
      community.postCount >= 0,
    );
  }
  // 5. Validate creation rate structure
  TestValidator.equals(
    "absolute_growth exists",
    analytics.creationRate.absolute_growth !== undefined,
    true,
  );
  TestValidator.equals(
    "percentage_change exists",
    analytics.creationRate.percentage_change !== undefined,
    true,
  );
  TestValidator.equals(
    "current_period_count exists",
    analytics.creationRate.current_period_count !== undefined,
    true,
  );
  TestValidator.equals(
    "previous_period_count exists",
    analytics.creationRate.previous_period_count !== undefined,
    true,
  );
  TestValidator.equals(
    "growth_rate exists",
    analytics.creationRate.growth_rate !== undefined,
    true,
  );
  // 6. Validate period structure
  TestValidator.equals(
    "start_date exists",
    analytics.period.start_date !== undefined,
    true,
  );
  TestValidator.equals(
    "end_date exists",
    analytics.period.end_date !== undefined,
    true,
  );
}

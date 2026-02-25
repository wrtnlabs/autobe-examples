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

export async function test_api_new_posts_analytics_data_structure(
  connection: api.IConnection,
): Promise<void> {
  // Initialize guest session for authentication
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: typia.random<IRedditCloneGuest.IJoin>(),
  });
  // Call the new posts analytics endpoint
  const result =
    await api.functional.redditClone.guest.analytics.posts._new.newPostsAnalytics(
      guestConnection,
    );
  typia.assert(result);
  // Validate period field contains correct start_date and end_date ISO timestamps
  typia.assert<string & tags.Format<"date-time">>(result.period.start_date);
  typia.assert<string & tags.Format<"date-time">>(result.period.end_date);
  // Validate totalPosts is a non-negative integer
  TestValidator.predicate("totalPosts non-negative", result.totalPosts >= 0);
  typia.assert<number & tags.Type<"int32">>(result.totalPosts);
  // Validate postsByCommunity array contains community statistics
  TestValidator.predicate(
    "postsByCommunity is array",
    Array.isArray(result.postsByCommunity),
  );
  for (const community of result.postsByCommunity) {
    typia.assert<string>(community.communityId);
    typia.assert<string>(community.communityName);
    TestValidator.predicate("postCount non-negative", community.postCount >= 0);
    typia.assert<number & tags.Type<"int32">>(community.postCount);
  }
  // Validate creationRate includes required metrics
  TestValidator.predicate(
    "absolute_growth is int32",
    typeof result.creationRate.absolute_growth === "number",
  );
  TestValidator.predicate(
    "percentage_change is number",
    typeof result.creationRate.percentage_change === "number",
  );
  TestValidator.predicate(
    "current_period_count is int32",
    typeof result.creationRate.current_period_count === "number",
  );
  TestValidator.predicate(
    "previous_period_count is int32",
    typeof result.creationRate.previous_period_count === "number",
  );
  TestValidator.predicate(
    "growth_rate is number",
    typeof result.creationRate.growth_rate === "number",
  );
  // Validate trends field exists
  TestValidator.predicate(
    "trends exists",
    result.trends !== null && result.trends !== undefined,
  );
}

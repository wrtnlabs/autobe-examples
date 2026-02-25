import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_new_posts_analytics_success(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection for analytics access
  const memberConnection: api.IConnection = { host: connection.host };
  // Register and login as member
  const member = await api.functional.redditClone.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
        displayName: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCloneMember.IJoin,
    },
  );
  typia.assert(member);
  // Create new connection with the member's token
  const authedConnection: api.IConnection = { host: connection.host };
  authedConnection.headers = {
    authorization: member.token.access,
  };
  // Call the analytics endpoint
  const result =
    await api.functional.redditClone.member.analytics.posts._new.newPostsAnalytics(
      authedConnection,
    );
  // Validate response structure
  typia.assert<IRedditCloneContentPost.INewPost>(result);
  // Verify discriminator field
  TestValidator.equals("type discriminator", result.type, "new");
  // Verify period structure
  TestValidator.predicate(
    "start_date exists",
    () => typeof result.period.start_date === "string",
  );
  TestValidator.predicate(
    "end_date exists",
    () => typeof result.period.end_date === "string",
  );
  // Verify main metrics
  TestValidator.predicate(
    "totalPosts is positive integer",
    () => typeof result.totalPosts === "number" && result.totalPosts >= 0,
  );
  // Verify community posts breakdown
  TestValidator.predicate("postsByCommunity is array", () =>
    Array.isArray(result.postsByCommunity),
  );
  // Verify creation rate metrics
  TestValidator.predicate(
    "creationRate.absolute_growth is number",
    () => typeof result.creationRate.absolute_growth === "number",
  );
  TestValidator.predicate(
    "creationRate.current_period_count is number",
    () => typeof result.creationRate.current_period_count === "number",
  );
  TestValidator.predicate(
    "creationRate.previous_period_count is number",
    () => typeof result.creationRate.previous_period_count === "number",
  );
  // Verify trend data
  TestValidator.predicate(
    "trends is string",
    () => typeof result.trends === "string",
  );
}

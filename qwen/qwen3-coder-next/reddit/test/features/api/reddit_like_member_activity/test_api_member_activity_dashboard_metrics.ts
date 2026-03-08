import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_activity_dashboard_metrics(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  // Call dashboard endpoint
  const dashboard =
    await api.functional.redditLike.member.activity.dashboard.at(
      memberConnection,
    );
  typia.assert(dashboard);
  // Validate all required fields
  TestValidator.predicate(
    "has total_posts",
    typeof dashboard.total_posts === "number",
  );
  TestValidator.predicate(
    "has posts_today",
    typeof dashboard.posts_today === "number",
  );
  TestValidator.predicate(
    "has total_comments",
    typeof dashboard.total_comments === "number",
  );
  TestValidator.predicate(
    "has comments_today",
    typeof dashboard.comments_today === "number",
  );
  TestValidator.predicate(
    "has total_votes",
    typeof dashboard.total_votes === "number",
  );
  TestValidator.predicate(
    "has comment_votes_today",
    typeof dashboard.comment_votes_today === "number",
  );
  TestValidator.predicate(
    "has total_communities",
    typeof dashboard.total_communities === "number",
  );
  TestValidator.predicate(
    "has subscribed_count",
    typeof dashboard.subscribed_count === "number",
  );
  TestValidator.predicate(
    "has pending_reports",
    typeof dashboard.pending_reports === "number",
  );
  TestValidator.predicate(
    "has active_users",
    typeof dashboard.active_users === "number",
  );
}

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

export async function test_api_member_activity_dashboard_empty_platform(
  connection: api.IConnection,
): Promise<void> {
  // Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: "12345678",
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(memberData);
  // Call the dashboard endpoint with authenticated connection
  const dashboard =
    await api.functional.redditLike.member.activity.dashboard.at(
      memberConnection,
    );
  typia.assert(dashboard);
  // Verify all metrics are zero for empty platform
  TestValidator.equals("total_posts should be 0", dashboard.total_posts, 0);
  TestValidator.equals("posts_today should be 0", dashboard.posts_today, 0);
  TestValidator.equals(
    "total_comments should be 0",
    dashboard.total_comments,
    0,
  );
  TestValidator.equals(
    "comments_today should be 0",
    dashboard.comments_today,
    0,
  );
  TestValidator.equals("total_votes should be 0", dashboard.total_votes, 0);
  TestValidator.equals(
    "comment_votes_today should be 0",
    dashboard.comment_votes_today,
    0,
  );
  TestValidator.equals(
    "total_communities should be 0",
    dashboard.total_communities,
    0,
  );
  TestValidator.equals(
    "subscribed_count should be 0",
    dashboard.subscribed_count,
    0,
  );
  TestValidator.equals(
    "pending_reports should be 0",
    dashboard.pending_reports,
    0,
  );
  TestValidator.equals("active_users should be 0", dashboard.active_users, 0);
}

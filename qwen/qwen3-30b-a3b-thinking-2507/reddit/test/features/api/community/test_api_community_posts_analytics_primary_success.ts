import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityPostAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_community_posts_analytics_primary_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
    } satisfies ICommunityMember.IJoin,
  });
  // 2. Retrieve analytics
  const analytics =
    await api.functional.community.member.analytics.posts.index(
      memberConnection,
    );
  typia.assert(analytics);
  // 3. Validate metrics
  TestValidator.equals("totalPosts > 0", analytics.totalPosts > 0, true);
  TestValidator.predicate("averageKarma > 0", analytics.averageKarma > 0);
  TestValidator.equals("topPosts length", analytics.topPosts.length, 5);
  TestValidator.predicate("topPosts non-empty", analytics.topPosts.length > 0);
  // 4. Validate post details in top posts
  const topPost = analytics.topPosts[0];
  TestValidator.predicate(
    "topPost has valid id",
    typeof topPost.id === "string",
  );
  TestValidator.predicate(
    "topPost has valid title",
    typeof topPost.title === "string",
  );
  TestValidator.predicate(
    "topPost has valid author id",
    typeof topPost.author.id === "string",
  );
  TestValidator.predicate(
    "topPost has valid community id",
    typeof topPost.community.id === "string",
  );
  TestValidator.equals("comments_count > 0", topPost.comments_count > 0, true);
}

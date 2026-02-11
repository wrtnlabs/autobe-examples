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

export async function test_api_community_posts_analytics_no_posts(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register as a new community member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
    } satisfies ICommunityMember.IJoin,
  });
  // 2. Call the analytics API using the member's connection
  const analytics =
    await api.functional.community.member.analytics.posts.index(
      memberConnection,
    );
  typia.assert(analytics);
  // 3. Validate the analytics response
  TestValidator.equals("totalPosts should be 0", analytics.totalPosts, 0);
  TestValidator.equals("averageKarma should be 0", analytics.averageKarma, 0);
  TestValidator.equals(
    "topPosts should be empty array",
    analytics.topPosts,
    [],
  );
}
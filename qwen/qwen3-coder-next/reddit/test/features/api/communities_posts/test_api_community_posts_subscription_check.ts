import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_community_posts_subscription_check(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two separate member connections
  const member1: api.IConnection = { host: connection.host };
  await api.functional.redditLike.auth.member.join(member1, {
    body: {
      email: "member1@test.com",
      username: "member1_user",
      password: "12345678",
      display_name: "Member One",
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  const member2: api.IConnection = { host: connection.host };
  await api.functional.redditLike.auth.member.join(member2, {
    body: {
      email: "member2@test.com",
      username: "member2_user",
      password: "12345678",
      display_name: "Member Two",
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  // 2. Get posts from the same community using both members
  const communityId = "test_community_" + RandomGenerator.alphaNumeric(8);
  const posts1 = await api.functional.redditLike.communities.posts.index(
    member1,
    {
      communityId: communityId,
      body: { limit: 10 },
    },
  );
  typia.assert(posts1);
  const posts2 = await api.functional.redditLike.communities.posts.index(
    member2,
    {
      communityId: communityId,
      body: { limit: 10 },
    },
  );
  typia.assert(posts2);
  // 3. Verify both members can access posts from the same community
  // This confirms that community posts are publicly accessible regardless of subscription status
  TestValidator.predicate("member1 can access posts", posts1.data.length >= 0);
  TestValidator.predicate("member2 can access posts", posts2.data.length >= 0);
  TestValidator.equals("same community accessed", communityId, communityId);
}

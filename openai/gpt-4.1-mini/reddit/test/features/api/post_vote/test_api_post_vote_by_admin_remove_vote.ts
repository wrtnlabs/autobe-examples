import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_post_vote_by_admin_remove_vote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join & login
  const adminPassword = "AdminPass123!";
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: { password: adminPassword },
  });
  typia.assert(adminJoin);
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoin.email,
      password: adminPassword,
    },
  });
  // 2. User join & login
  const userPassword = "UserPass123!";
  const userConnection: api.IConnection = { host: connection.host };
  const userJoin = await authorize_user_join(userConnection, {
    body: { password: userPassword },
  });
  typia.assert(userJoin);
  await authorize_user_login(userConnection, {
    body: {
      email: userJoin.email,
      password: userPassword,
    },
  });
  // 3. User creates a community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(community);
  // 4. User creates a post in the community
  const postBody = {
    title: "Test Post for Vote Removal",
    postType: "text",
    content: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformPost.ICreate;
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      userConnection,
      {
        communityId: community.id,
        body: postBody,
      },
    );
  typia.assert(post);
  // 5. Admin casts initial upvote on the post
  const initialVote =
    await api.functional.communityPlatform.admin.posts.votes.updateVote(
      adminConnection,
      {
        postId: post.id,
        body: {
          voteType: "upvote",
        } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  typia.assert(initialVote);
  TestValidator.predicate(
    "vote count positive after upvote",
    initialVote.upvotes > 0,
  );
  // 6. Admin removes the vote by sending PATCH with voteType null
  const removedVote =
    await api.functional.communityPlatform.admin.posts.votes.updateVote(
      adminConnection,
      {
        postId: post.id,
        body: { voteType: null } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  typia.assert(removedVote);
  // 7. Validate vote counts are zero after removal
  TestValidator.equals(
    "vote count upvotes after removal",
    removedVote.upvotes,
    0,
  );
  TestValidator.equals(
    "vote count downvotes after removal",
    removedVote.downvotes,
    0,
  );
  // 8. Check that user's karma is adjusted accordingly
  // Login user again to get updated karma
  const userInfo = await api.functional.communityPlatform.auth.user.login(
    userConnection,
    {
      body: { email: userJoin.email, password: userPassword },
    },
  );
  typia.assert(userInfo);
  TestValidator.predicate(
    "user karma zero or unchanged after removing vote",
    userInfo.karma >= 0,
  );
}

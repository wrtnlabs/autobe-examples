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

export async function test_api_post_vote_by_admin_change_vote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join & login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinPayload = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
  };
  const admin = await authorize_admin_join(adminConnection, {
    body: adminJoinPayload,
  });
  typia.assert(admin);
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoinPayload.email,
      password: adminJoinPayload.password,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // 2. User join & login
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinPayload = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  };
  const user = await authorize_user_join(userConnection, {
    body: userJoinPayload,
  });
  typia.assert(user);
  await authorize_user_login(userConnection, {
    body: {
      email: userJoinPayload.email,
      password: userJoinPayload.password,
    } satisfies ICommunityPlatformUser.ILogin,
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
    title: RandomGenerator.name(),
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
  // 5. Admin casts an upvote
  const voteUpBody = {
    voteType: "upvote",
  } satisfies ICommunityPlatformPostVote.IUpdate;
  let voteResult =
    await api.functional.communityPlatform.admin.posts.votes.updateVote(
      adminConnection,
      {
        postId: post.id,
        body: voteUpBody,
      },
    );
  typia.assert(voteResult);
  const upvotesAfterUp = voteResult.upvotes;
  const downvotesAfterUp = voteResult.downvotes;
  TestValidator.predicate("upvotes increase after upvote", upvotesAfterUp > 0);
  TestValidator.equals("downvotes unchanged after upvote", downvotesAfterUp, 0);
  // 6. Admin changes vote to downvote
  const voteDownBody = {
    voteType: "downvote",
  } satisfies ICommunityPlatformPostVote.IUpdate;
  voteResult =
    await api.functional.communityPlatform.admin.posts.votes.updateVote(
      adminConnection,
      {
        postId: post.id,
        body: voteDownBody,
      },
    );
  typia.assert(voteResult);
  TestValidator.predicate(
    "downvotes increase after changing to downvote",
    voteResult.downvotes > downvotesAfterUp,
  );
  TestValidator.predicate(
    "upvotes decrease after changing to downvote",
    voteResult.upvotes < upvotesAfterUp,
  );
  // 7. Admin removes vote
  const voteRemoveBody = {
    voteType: null,
  } satisfies ICommunityPlatformPostVote.IUpdate;
  voteResult =
    await api.functional.communityPlatform.admin.posts.votes.updateVote(
      adminConnection,
      {
        postId: post.id,
        body: voteRemoveBody,
      },
    );
  typia.assert(voteResult);
  TestValidator.equals("votes reset after removal", voteResult.upvotes, 0);
  TestValidator.equals("votes reset after removal", voteResult.downvotes, 0);
}

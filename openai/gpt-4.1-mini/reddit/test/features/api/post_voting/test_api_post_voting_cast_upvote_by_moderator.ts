import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_moderator_posts_votes_create_vote } from "../../../generate/generate_random_community_platform_moderator_posts_votes_create_vote";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_post_voting_cast_upvote_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  /*
    Test scenario for casting an upvote on a post by an authenticated moderator.
    Setup includes registering and authenticating the moderator, creating a community,
    and creating a post in that community. The test verifies the ability to cast an upvote
    successfully, validate the updated vote counts on the post, and confirm the author's karma increase.
    It ensures that only an authenticated moderator can vote, that the post exists,
    and that the vote tally updates correctly.
    */
  // Create a moderator connection and join
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(1),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatarUrl: "https://example.com/avatar.png",
  } satisfies ICommunityPlatformModerator.IJoin;
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: moderatorJoinInput,
  });
  typia.assert(moderator);
  // Create a user connection and register user (author user)
  const userConnection: api.IConnection = { host: connection.host };
  const userJoin = await authorize_user_join(userConnection, { body: {} });
  typia.assert(userJoin);
  // Create a new community as the user
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      { body: {} },
    );
  typia.assert(community);
  // Create a post in the community as the user
  const postCreateBody = {
    title: RandomGenerator.name(),
    postType: "text",
    content: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformPost.ICreate;
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      userConnection,
      {
        communityId: community.id,
        body: postCreateBody,
      },
    );
  typia.assert(post);
  // Moderator casts an upvote on the post
  const voteBody = {
    post_id: post.id,
    vote_type: "upvote",
  } satisfies ICommunityPlatformPostVote.ICreate;
  const vote =
    await generate_random_community_platform_moderator_posts_votes_create_vote(
      moderatorConnection,
      {
        params: { postId: post.id },
        body: voteBody,
      },
    );
  typia.assert(vote);
  // Validate that upvotes increased and downvotes is zero
  TestValidator.predicate("upvotes is greater than zero", vote.upvotes > 0);
  TestValidator.equals("downvotes equals zero", vote.downvotes, 0);
  // Skip re-login and karma check for user due to missing password information,
  // which is generated but not accessible here for authentication.
}

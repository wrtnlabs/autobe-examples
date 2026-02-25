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

export async function test_api_post_voting_change_vote_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Setup moderator and user connections
  const moderatorConnection: api.IConnection = { host: connection.host };
  const userConnection: api.IConnection = { host: connection.host };
  // 1. Create a user account and login
  const userAuth = await authorize_user_join(userConnection, { body: {} });
  typia.assert(userAuth);
  userConnection.headers = { Authorization: userAuth.token.access };
  // 2. Create a moderator account and login
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, { body: {} });
  typia.assert(moderatorAuth);
  moderatorConnection.headers = { Authorization: moderatorAuth.token.access };
  // 3. User creates a community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(community);
  // 4. User creates a post in the community
  const postCreateBody: ICommunityPlatformPost.ICreate = {
    title: "Test Post for Voting",
    postType: "text",
    content: "This is a text post to test voting.",
  };
  // Use SDK directly because no utility generate function available for posts create
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      userConnection,
      {
        communityId: community.id,
        body: postCreateBody,
      },
    );
  typia.assert(post);
  // 5. Moderator casts initial upvote on the post
  const upvoteBody: ICommunityPlatformPostVote.ICreate = {
    post_id: post.id,
    vote_type: "upvote",
  };
  const upvoteResult =
    await generate_random_community_platform_moderator_posts_votes_create_vote(
      moderatorConnection,
      {
        params: { postId: post.id },
        body: upvoteBody,
      },
    );
  typia.assert(upvoteResult);
  TestValidator.predicate(
    "initial upvote has more upvotes than downvotes",
    upvoteResult.upvotes > upvoteResult.downvotes,
  );
  // 6. Moderator changes the vote from upvote to downvote
  const downvoteBody: ICommunityPlatformPostVote.ICreate = {
    post_id: post.id,
    vote_type: "downvote",
  };
  const downvoteResult =
    await generate_random_community_platform_moderator_posts_votes_create_vote(
      moderatorConnection,
      {
        params: { postId: post.id },
        body: downvoteBody,
      },
    );
  typia.assert(downvoteResult);
  // The downvotes count should be now higher or equal than upvotes
  TestValidator.predicate(
    "after changing vote, downvotes are more or equal to upvotes",
    downvoteResult.downvotes >= downvoteResult.upvotes,
  );
}

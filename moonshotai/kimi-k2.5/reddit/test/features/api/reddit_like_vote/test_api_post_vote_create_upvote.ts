import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import type { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import type { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import type { IRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_post_vote_create_upvote(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member A (post author)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA: IRedditLikeMember.IAuthorized = await authorize_member_join(
    memberAConnection,
    { body: {} },
  );
  typia.assert(memberA);
  // Step 2: Create a community as member A
  const community: IRedditLikeCommunity =
    await generate_random_reddit_like_member_communities_create(
      memberAConnection,
      { body: {} },
    );
  typia.assert(community);
  // Step 3: Subscribe member A to the community
  const memberASubscription: IRedditLikeCommunitySubscription =
    await api.functional.redditLike.member.communities.subscriptions.create(
      memberAConnection,
      { communityId: community.id },
    );
  typia.assert(memberASubscription);
  // Step 4: Create a text post as member A
  const post: IRedditLikePost =
    await generate_random_reddit_like_member_posts_create(memberAConnection, {
      body: {
        community_id: community.id,
        title: "Test post for upvote",
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);
  // Step 5: Create member B (voter)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB: IRedditLikeMember.IAuthorized = await authorize_member_join(
    memberBConnection,
    { body: {} },
  );
  typia.assert(memberB);
  // Step 6: Subscribe member B to the same community
  const memberBSubscription: IRedditLikeCommunitySubscription =
    await api.functional.redditLike.member.communities.subscriptions.create(
      memberBConnection,
      { communityId: community.id },
    );
  typia.assert(memberBSubscription);
  // Step 7: Cast an upvote on the post as member B
  const vote: IRedditLikeVote =
    await api.functional.redditLike.member.posts.my_vote.update(
      memberBConnection,
      {
        postId: post.id,
        body: { vote_type: "upvote" } satisfies IRedditLikeVote.IUpdate,
      },
    );
  typia.assert(vote);
  // Step 8: Validate the upvote response
  TestValidator.equals("vote_type matches input", vote.vote_type, "upvote");
  TestValidator.equals(
    "member ID matches member B",
    vote.member.id,
    memberB.id,
  );
  TestValidator.equals(
    "member email matches member B",
    vote.member.email,
    memberB.email,
  );
  TestValidator.equals(
    "member username matches member B",
    vote.member.username,
    memberB.username,
  );
}

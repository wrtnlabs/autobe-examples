import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
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
import { generate_random_reddit_like_member_comments_votes_create } from "../../../generate/generate_random_reddit_like_member_comments_votes_create";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_vote } from "../../../prepare/prepare_random_reddit_like_vote";

export async function test_api_comment_upvote_on_other_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as Member B (comment author)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, { body: {} });
  typia.assert(memberB);
  // Step 2: Member B creates a community
  const community = await generate_random_reddit_like_member_communities_create(
    memberBConnection,
    { body: {} },
  );
  typia.assert(community);
  // Step 3: Member B subscribes to the community (required to create posts)
  await api.functional.redditLike.member.communities.subscriptions.create(
    memberBConnection,
    { communityId: community.id },
  );
  // Step 4: Member B creates a post in the community
  const post = await generate_random_reddit_like_member_posts_create(
    memberBConnection,
    { body: { community_id: community.id } },
  );
  typia.assert(post);
  // Step 5: Member B creates a comment on the post
  const comment =
    await generate_random_reddit_like_member_posts_comments_create(
      memberBConnection,
      { params: { postId: post.id }, body: {} },
    );
  typia.assert(comment);
  // Step 6: Authenticate as Member A (voter)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, { body: {} });
  typia.assert(memberA);
  // Step 7: Member A casts an upvote on Member B's comment
  const vote = await generate_random_reddit_like_member_comments_votes_create(
    memberAConnection,
    { params: { commentId: comment.id }, body: { vote_type: "upvote" } },
  );
  typia.assert(vote);
  // Validation: Vote type is upvote
  TestValidator.equals("vote_type is upvote", vote.vote_type, "upvote");
  // Validation: Member field in response reflects Member A (the voter)
  TestValidator.equals("voter is Member A", vote.member.id, memberA.id);
  // Validation: Each member can only cast one vote per comment
  await TestValidator.error("duplicate vote should be rejected", async () => {
    await generate_random_reddit_like_member_comments_votes_create(
      memberAConnection,
      { params: { commentId: comment.id }, body: { vote_type: "upvote" } },
    );
  });
}

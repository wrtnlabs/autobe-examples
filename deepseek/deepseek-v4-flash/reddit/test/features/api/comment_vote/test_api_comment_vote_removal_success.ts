import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_subscribers_create } from "../../../generate/generate_random_community_platform_member_communities_subscribers_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_comments_votes_create } from "../../../generate/generate_random_community_platform_member_posts_comments_votes_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

/**
 * Test successful removal of a member's own vote from a comment.
 *
 * Validates the full lifecycle of a comment vote: creation through deletion. Verifies that after voting, the comment's vote_score reflects the vote, and after deletion, the erase operation completes without error.
 *
 * A second member (Member B) creates the comment to avoid the self-voting restriction — only the comment author's own votes on their own content are prohibited. Member A acts as the community creator, post author, and voter.
 *
 * 1. Register Member A as an authenticated member.
 * 2. Register Member B as an authenticated member.
 * 3. Member A creates a community with a unique name, description, and icon image.
 * 4. Member A subscribes to the community.
 * 5. Member A creates a text post in the community.
 * 6. Member B creates a comment on the post.
 * 7. Member A casts an upvote (+1) on the comment and validates vote_score = +1.
 * 8. Member A deletes the vote via the erase endpoint.
 * 9. Verifies the erase operation completed successfully (no error thrown).
 */
export async function test_api_comment_vote_removal_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const authorizedA = await authorize_member_join(memberAConnection, {});
  typia.assert(authorizedA);
  // 2. Register Member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const authorizedB = await authorize_member_join(memberBConnection, {});
  typia.assert(authorizedB);
  // 3. Member A creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 4. Member A subscribes to the community
  const subscription =
    await generate_random_community_platform_member_communities_subscribers_create(
      memberAConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(subscription);
  // 5. Member A creates a text post in the community
  const post = await generate_random_community_platform_member_posts_create(
    memberAConnection,
    {
      body: {
        communityId: community.id,
        type: "text",
        body: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // 6. Member B creates a comment on the post
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberBConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  TestValidator.equals("initial comment vote score", comment.voteScore, 0);
  // 7. Member A casts an upvote (+1) on the comment
  const vote =
    await generate_random_community_platform_member_posts_comments_votes_create(
      memberAConnection,
      {
        body: {
          value: 1,
        },
        params: {
          postId: post.id,
          commentId: comment.id,
        },
      },
    );
  typia.assert(vote);
  TestValidator.equals(
    "comment vote score after upvote",
    vote.comment.vote_score,
    1,
  );
  // 8. Member A deletes the vote
  await api.functional.communityPlatform.member.posts.comments.votes.erase(
    memberAConnection,
    {
      postId: post.id,
      commentId: comment.id,
      voteId: vote.id,
    },
  );
}

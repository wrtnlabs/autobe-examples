import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
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
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_comment_vote_upvote_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Author member setup
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  typia.assert(author);
  // Store author's initial karma
  const authorInitialKarma = author.karma;
  // 2. Author creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community);
  // 3. Author subscribes to their own community
  const authorSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      authorConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(authorSubscription);
  // 4. Author creates a post in the community
  const post = await generate_random_community_platform_member_posts_create(
    authorConnection,
    {
      body: {
        communityId: community.id,
        contentType: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        textContent: RandomGenerator.content({ paragraphs: 2 }),
        linkUrl: null,
        imageUrl: null,
      },
    },
  );
  typia.assert(post);
  // 5. Author creates a comment on the post
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      authorConnection,
      {
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // Store the comment's initial score
  const initialCommentScore = comment.score;
  // 6. Voter member setup
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {});
  typia.assert(voter);
  // 7. Voter subscribes to the same community
  await generate_random_community_platform_member_subscriptions_create(
    voterConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  // 8. Voter casts an upvote on the author's comment
  const upvotedComment =
    await api.functional.communityPlatform.member.comments.vote(
      voterConnection,
      {
        commentId: comment.id,
        body: {
          voteType: "upvote",
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(upvotedComment);
  // Verify upvote increased the score by 1
  TestValidator.equals(
    "upvote increases comment score by 1",
    upvotedComment.score,
    initialCommentScore + 1,
  );
  // 9. Voter removes the upvote via DELETE endpoint
  await api.functional.communityPlatform.member.comments._vote.erase(
    voterConnection,
    {
      commentId: comment.id,
    },
  );
  // 10. Verify removal by re-upvoting (proves the vote was truly removed)
  const reUpvotedComment =
    await api.functional.communityPlatform.member.comments.vote(
      voterConnection,
      {
        commentId: comment.id,
        body: {
          voteType: "upvote",
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(reUpvotedComment);
  // If removal worked, re-upvoting should increase score from initial to initial+1 again
  TestValidator.equals(
    "score returns to initial after removal, then increases on re-upvote",
    reUpvotedComment.score,
    initialCommentScore + 1,
  );
  // 11. Clean up: Remove the upvote again
  await api.functional.communityPlatform.member.comments._vote.erase(
    voterConnection,
    {
      commentId: comment.id,
    },
  );
  // 12. Verify voter is in neutral state by casting a downvote
  const downvotedComment =
    await api.functional.communityPlatform.member.comments.vote(
      voterConnection,
      {
        commentId: comment.id,
        body: {
          voteType: "downvote",
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(downvotedComment);
  // Downvote should decrease the score from initial to initial-1
  TestValidator.equals(
    "downvote works after upvote removal",
    downvotedComment.score,
    initialCommentScore - 1,
  );
}

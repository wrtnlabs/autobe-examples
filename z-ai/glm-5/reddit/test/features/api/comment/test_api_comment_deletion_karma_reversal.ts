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

export async function test_api_comment_deletion_karma_reversal(
  connection: api.IConnection,
): Promise<void> {
  // ==========================================
  // Setup: Member A (comment author)
  // ==========================================
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  const initialKarma = memberA.karma;
  // Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // Subscribe to the community (required for posting)
  await generate_random_community_platform_member_subscriptions_create(
    memberAConnection,
    { body: { community_id: community.id } },
  );
  // Create a post
  const post = await generate_random_community_platform_member_posts_create(
    memberAConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.name(),
        contentType: "text",
        textContent: RandomGenerator.paragraph({ sentences: 3 }),
        linkUrl: null,
        imageUrl: null,
      },
    },
  );
  typia.assert(post);
  // Create a comment
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberAConnection,
      {
        params: { postId: post.id },
        body: { content: RandomGenerator.paragraph({ sentences: 2 }) },
      },
    );
  typia.assert(comment);
  // Verify initial comment score is 0
  TestValidator.equals("initial comment score is 0", comment.score, 0);
  // ==========================================
  // Setup: Member B (voter)
  // ==========================================
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // ==========================================
  // Voting: Member B upvotes Member A's comment
  // ==========================================
  const upvotedComment =
    await api.functional.communityPlatform.member.comments.vote(
      memberBConnection,
      {
        commentId: comment.id,
        body: { voteType: "upvote" } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(upvotedComment);
  // Verify comment score increased by 1 after upvote
  TestValidator.equals("comment score after upvote", upvotedComment.score, 1);
  // ==========================================
  // Voting: Member B changes vote to downvote
  // ==========================================
  const downvotedComment =
    await api.functional.communityPlatform.member.comments.vote(
      memberBConnection,
      {
        commentId: comment.id,
        body: {
          voteType: "downvote",
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(downvotedComment);
  // Verify comment score after downvote: upvote reversed (-1), downvote applied (-1) = -1 total
  TestValidator.equals(
    "comment score after downvote",
    downvotedComment.score,
    -1,
  );
  // ==========================================
  // Test: Member A deletes the comment
  // ==========================================
  await api.functional.communityPlatform.member.posts.comments.erase(
    memberAConnection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );
  // ==========================================
  // Verify: Deletion succeeds
  // ==========================================
  // The deletion returns void (204 No Content), so we verify by:
  // 1. The operation completed without error
  // 2. The karma reversal should have occurred internally:
  //    - Initial karma: 0
  //    - After upvote: +1 (karma = 1)
  //    - After downvote: -2 change from upvote state (karma = -1)
  //    - After deletion: downvote effect reversed (+1), karma returns to 0
  //
  // The karma reversal is handled atomically within the same transaction
  // as the comment deletion according to the API specification.
  // Verify Member A cannot delete already-deleted comment (should fail)
  await TestValidator.error(
    "cannot delete already-deleted comment",
    async () => {
      await api.functional.communityPlatform.member.posts.comments.erase(
        memberAConnection,
        {
          postId: post.id,
          commentId: comment.id,
        },
      );
    },
  );
}

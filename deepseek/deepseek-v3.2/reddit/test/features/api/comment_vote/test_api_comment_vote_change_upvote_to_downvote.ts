import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
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
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_comment_vote_change_upvote_to_downvote(
  connection: api.IConnection,
): Promise<void> {
  // Create voting member connection
  const voterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(voterConnection, {});
  // Create comment author connection
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  typia.assert(author!);
  // Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community!);
  // Subscribe voter to community
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      voterConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription!);
  // Create post
  const post = await generate_random_community_platform_member_posts_create(
    voterConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: community.name,
        content_type: "TEXT" as const,
        content_text: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post!);
  // Create comment by author
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      authorConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parentCommentId: null,
        } satisfies ICommunityPlatformComment.ICreate,
        params: { postId: post.id },
      },
    );
  typia.assert(comment!);
  // Verify initial comment vote score is 0
  TestValidator.equals("initial comment vote score", comment.vote_score, 0);
  // Step 1: Voter upvotes the comment
  const upvote =
    await api.functional.communityPlatform.member.comments.votes.patchByCommentid(
      voterConnection,
      {
        commentId: comment.id,
        body: {
          type: "upvote" as const,
        } satisfies ICommunityPlatformCommentVote.IRequest,
      },
    );
  typia.assert(upvote!);
  TestValidator.equals("vote type after upvote", upvote.type, "upvote");
  TestValidator.equals(
    "comment vote score after upvote",
    upvote.comment.voteScore,
    1,
  );
  // Step 2: Voter changes vote to downvote
  const downvote =
    await api.functional.communityPlatform.member.comments.votes.patchByCommentid(
      voterConnection,
      {
        commentId: comment.id,
        body: {
          type: "downvote" as const,
        } satisfies ICommunityPlatformCommentVote.IRequest,
      },
    );
  typia.assert(downvote!);
  TestValidator.equals("vote type after downvote", downvote.type, "downvote");
  TestValidator.equals(
    "comment vote score after downvote",
    downvote.comment.voteScore,
    -1,
  );
  TestValidator.predicate(
    "updated_at should be after created_at",
    new Date(downvote.updated_at).getTime() >
      new Date(downvote.created_at).getTime(),
  );
  // Verify vote record consistency - same vote ID should be updated
  TestValidator.equals("vote ID should be same", upvote.id, downvote.id);
  // Verify comment vote score decreased by 2 (from +1 to -1)
  TestValidator.equals(
    "vote score decreased by 2",
    downvote.comment.voteScore,
    upvote.comment.voteScore - 2,
  );
}

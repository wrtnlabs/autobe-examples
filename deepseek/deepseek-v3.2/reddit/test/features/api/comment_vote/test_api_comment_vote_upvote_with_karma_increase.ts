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
import { generate_random_community_platform_member_comments_votes_create } from "../../../generate/generate_random_community_platform_member_comments_votes_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_comment_vote_upvote_with_karma_increase(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member (voter)
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {});
  typia.assert(voter);
  // 2. Create second member (comment author)
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  typia.assert(author);
  // Verify initial karma is 0
  TestValidator.equals("author initial karma is 0", author.karma, 0);
  // 3. First member creates community
  const community =
    await generate_random_community_platform_member_communities_create(
      voterConnection,
      {},
    );
  typia.assert(community);
  // 4. First member subscribes to community
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
  typia.assert(subscription);
  // 5. First member creates TEXT post in community
  const post = await generate_random_community_platform_member_posts_create(
    voterConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        community_name: community.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Second member creates comment on post
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      authorConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies ICommunityPlatformComment.ICreate,
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  // Verify initial comment vote score is 0
  TestValidator.equals(
    "initial comment vote score is 0",
    comment.vote_score,
    0,
  );
  // 7. First member upvotes the comment
  const vote =
    await generate_random_community_platform_member_comments_votes_create(
      voterConnection,
      {
        body: {
          type: "upvote",
        } satisfies ICommunityPlatformCommentVote.ICreate,
        params: { commentId: comment.id },
      },
    );
  typia.assert(vote);
  // Verify vote creation
  TestValidator.equals("vote type is upvote", vote.type, "upvote");
  TestValidator.notEquals("vote created_at is set", vote.created_at, null);
  TestValidator.notEquals("vote updated_at is set", vote.updated_at, null);
  TestValidator.equals("vote deleted_at is null", vote.deleted_at, null);
  TestValidator.equals("vote member matches voter", vote.member.id, voter.id);
  TestValidator.equals(
    "vote comment matches target",
    vote.comment.id,
    comment.id,
  );
  // 8. Verify vote uniqueness - duplicate vote should fail
  await TestValidator.error("duplicate vote should fail", async () => {
    await generate_random_community_platform_member_comments_votes_create(
      voterConnection,
      {
        body: {
          type: "upvote",
        } satisfies ICommunityPlatformCommentVote.ICreate,
        params: { commentId: comment.id },
      },
    );
  });
  // Note: Cannot verify karma increase or comment vote score increase
  // because no GET endpoints for member or comment are available in the SDK.
  // The test verifies vote creation succeeds and duplicate voting fails,
  // which are the core requirements for the voting system.
}

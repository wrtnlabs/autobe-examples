import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IECommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityPlatformPostType";
import type { IECommunityPlatformPostVisibilityState } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityPlatformPostVisibilityState";
import type { IECommunityVisibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityVisibility";

/**
 * Validate updating a comment vote by a non-author member user, including
 * initial upvote, idempotent repeat, and change to downvote.
 *
 * Flow:
 *
 * 1. Join two member users (User A = voter, User B = author) using separate
 *    connections to isolate auth tokens without touching headers directly.
 * 2. As User B (author), create a community, a TEXT post in that community, and a
 *    top-level comment under the post.
 * 3. As User A (voter), upsert an upvote (+1) on the comment, repeat (+1) to
 *    validate idempotency, then change to a downvote (-1).
 *
 * Validations:
 *
 * - All responses pass typia.assert() for perfect DTO conformance.
 * - Vote refers to the correct comment (referential integrity).
 * - Idempotency: repeating +1 preserves value and record id.
 * - Change behavior: value becomes -1 on update.
 */
export async function test_api_comment_vote_update_success_change_and_idempotency(
  connection: api.IConnection,
) {
  // Prepare two independent connections (allowed unauth pattern)
  const connA: api.IConnection = { ...connection, headers: {} }; // voter
  const connB: api.IConnection = { ...connection, headers: {} }; // author

  // 1) Register User A (voter)
  const joinBodyA = {
    email: typia.random<string & tags.Format<"email">>(),
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[A-Za-z0-9_]{3,20}$">
    >(),
    password: typia.random<
      string &
        tags.MinLength<8> &
        tags.MaxLength<64> &
        tags.Pattern<"^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d\\S]{8,64}$">
    >(),
    terms_accepted_at: typia.random<string & tags.Format<"date-time">>(),
    privacy_accepted_at: typia.random<string & tags.Format<"date-time">>(),
    marketing_opt_in: RandomGenerator.pick([true, false] as const),
  } satisfies ICommunityPlatformMemberUser.ICreate;
  const userA = await api.functional.auth.memberUser.join(connA, {
    body: joinBodyA,
  });
  typia.assert(userA);

  // 1) Register User B (author)
  const joinBodyB = {
    email: typia.random<string & tags.Format<"email">>(),
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[A-Za-z0-9_]{3,20}$">
    >(),
    password: typia.random<
      string &
        tags.MinLength<8> &
        tags.MaxLength<64> &
        tags.Pattern<"^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d\\S]{8,64}$">
    >(),
    terms_accepted_at: typia.random<string & tags.Format<"date-time">>(),
    privacy_accepted_at: typia.random<string & tags.Format<"date-time">>(),
    marketing_opt_in: RandomGenerator.pick([true, false] as const),
  } satisfies ICommunityPlatformMemberUser.ICreate;
  const userB = await api.functional.auth.memberUser.join(connB, {
    body: joinBodyB,
  });
  typia.assert(userB);

  // 2) As User B, create a community
  const communityBody = {
    name: `c_${RandomGenerator.alphaNumeric(10)}`,
    display_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 6,
      sentenceMax: 12,
      wordMin: 3,
      wordMax: 8,
    }),
    visibility: "public" as IECommunityVisibility,
    nsfw: false,
    auto_archive_days: 30,
    language: RandomGenerator.pick(["en", "ko", "ja", "zh"] as const),
    region: RandomGenerator.pick(["US", "KR", "JP", "CN"] as const),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connB,
      { body: communityBody },
    );
  typia.assert(community);

  // 2) As User B, create a TEXT post in that community
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 3, wordMax: 10 }),
    type: "TEXT",
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 8,
      sentenceMax: 16,
      wordMin: 3,
      wordMax: 8,
    }),
    nsfw: false,
    spoiler: false,
  } satisfies ICommunityPlatformPost.ICreate.ITEXT;
  const post =
    await api.functional.communityPlatform.memberUser.communities.posts.create(
      connB,
      {
        communityId: community.id,
        body: postBody,
      },
    );
  typia.assert(post);

  // 2) As User B, create a top-level comment under the post
  const commentBody = {
    body: RandomGenerator.paragraph({ sentences: 12, wordMin: 3, wordMax: 9 }),
  } satisfies ICommunityPlatformComment.ICreate;
  const comment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connB,
      {
        postId: post.id,
        body: commentBody,
      },
    );
  typia.assert(comment);

  // 3) As User A, upvote (+1)
  const voteUp1 =
    await api.functional.communityPlatform.memberUser.comments.vote.update(
      connA,
      {
        commentId: comment.id,
        body: { value: 1 } satisfies ICommunityPlatformCommentVote.IUpdate,
      },
    );
  typia.assert(voteUp1);
  TestValidator.equals(
    "vote refers to the correct comment",
    voteUp1.community_platform_comment_id,
    comment.id,
  );
  TestValidator.equals("upvote value persisted (+1)", voteUp1.value, 1);

  // 3) Repeat upvote (+1) for idempotency
  const voteUp2 =
    await api.functional.communityPlatform.memberUser.comments.vote.update(
      connA,
      {
        commentId: comment.id,
        body: { value: 1 } satisfies ICommunityPlatformCommentVote.IUpdate,
      },
    );
  typia.assert(voteUp2);
  TestValidator.equals("idempotent: vote id stable", voteUp2.id, voteUp1.id);
  TestValidator.equals("idempotent: value remains +1", voteUp2.value, 1);
  TestValidator.equals(
    "idempotent: comment reference stable",
    voteUp2.community_platform_comment_id,
    comment.id,
  );

  // 3) Change to downvote (-1)
  const voteDown =
    await api.functional.communityPlatform.memberUser.comments.vote.update(
      connA,
      {
        commentId: comment.id,
        body: { value: -1 } satisfies ICommunityPlatformCommentVote.IUpdate,
      },
    );
  typia.assert(voteDown);
  TestValidator.equals("toggle: record id unchanged", voteDown.id, voteUp1.id);
  TestValidator.equals("toggle: value updated to -1", voteDown.value, -1);
  TestValidator.equals(
    "toggle: comment reference remains correct",
    voteDown.community_platform_comment_id,
    comment.id,
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IECommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityPlatformPostType";
import type { IECommunityPlatformPostVisibilityState } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityPlatformPostVisibilityState";
import type { IECommunityVisibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityVisibility";

/**
 * Idempotent vote clearing on a comment without prior vote.
 *
 * This test validates that a member user can call DELETE
 * /communityPlatform/memberUser/comments/{commentId}/vote successfully even
 * when no active vote exists (never voted or already cleared), and that the
 * operation is idempotent on repeated calls.
 *
 * Steps:
 *
 * 1. Register two users: User B (author) and User A (voter)
 * 2. As User B, create a community, a TEXT post within it, then a comment
 * 3. Switch to User A (no prior vote)
 * 4. Call DELETE vote twice to confirm idempotency
 * 5. Negative: unauthenticated DELETE must fail
 */
export async function test_api_comment_vote_clear_without_prior_vote_idempotent(
  connection: api.IConnection,
) {
  // 1) Register User B (author)
  const joinBodyB = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: `Passw0rd${RandomGenerator.alphaNumeric(4)}`,
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
  } satisfies ICommunityPlatformMemberUser.ICreate;
  const userB = await api.functional.auth.memberUser.join(connection, {
    body: joinBodyB,
  });
  typia.assert(userB);

  // 2) As User B, create community → post → comment
  const communityBody = {
    name: `comm_${RandomGenerator.alphaNumeric(10)}`,
    visibility: "public" as IECommunityVisibility,
    nsfw: false,
    auto_archive_days: 30,
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    type: "TEXT" as const,
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 8,
      sentenceMax: 15,
    }),
    nsfw: false,
    spoiler: false,
  } satisfies ICommunityPlatformPost.ICreate;
  const post =
    await api.functional.communityPlatform.memberUser.communities.posts.create(
      connection,
      { communityId: community.id, body: postBody },
    );
  typia.assert(post);
  TestValidator.equals(
    "post belongs to created community",
    post.community_platform_community_id,
    community.id,
  );

  const commentBody = {
    body: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformComment.ICreate;
  const comment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      { postId: post.id, body: commentBody },
    );
  typia.assert(comment);
  TestValidator.equals(
    "comment belongs to created post",
    comment.community_platform_post_id,
    post.id,
  );

  // 3) Switch to User A (voter) - no prior vote
  const joinBodyA = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(9),
    password: `Passw0rd${RandomGenerator.alphaNumeric(5)}`,
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
  } satisfies ICommunityPlatformMemberUser.ICreate;
  const userA = await api.functional.auth.memberUser.join(connection, {
    body: joinBodyA,
  });
  typia.assert(userA);

  // 4) Clear vote twice to validate idempotency with no prior vote
  await api.functional.communityPlatform.memberUser.comments.vote.erase(
    connection,
    { commentId: comment.id },
  );
  // Repeat - must also succeed without error
  await api.functional.communityPlatform.memberUser.comments.vote.erase(
    connection,
    { commentId: comment.id },
  );

  // 5) Negative: unauthenticated request should be rejected
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated vote erase must fail",
    async () => {
      await api.functional.communityPlatform.memberUser.comments.vote.erase(
        unauthConn,
        { commentId: comment.id },
      );
    },
  );
}

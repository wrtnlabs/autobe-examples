import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentEditHistory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLinks } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLinks";
import type { ICommunityPlatformPostTexts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTexts";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate permissions for creating comment edit history records.
 *
 * This test checks that only the comment author or privileged actors can append
 * an edit history record to a comment. The test performs the following
 * workflow:
 *
 * 1. User A registers and creates a community, a post in that community, and a
 *    comment on that post.
 * 2. User B registers and attempts to append an edit history for the comment
 *    created by User A. This operation should be rejected due to insufficient
 *    permissions.
 *
 * Steps:
 *
 * - Register User A and User B with random emails.
 * - User A creates a community (random name and description, to ensure
 *   isolation).
 * - User A creates a post in their community (random title and text content).
 * - User A comments on the post.
 * - User B attempts to append an edit history for User A's comment.
 * - The attempt must be rejected (permission denied), validating access controls
 *   and audit traceability.
 */
export async function test_api_comment_edit_history_creation_permissions_enforced(
  connection: api.IConnection,
) {
  // Step 1: User A registers
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userA: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userAEmail,
        password: "Password123!",
        display_name: RandomGenerator.name(),
        ip: null,
        href: "https://community-app.test/register",
        referrer: "https://community-app.test/landing",
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(userA);

  // Step 2: User A creates a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: RandomGenerator.alphabets(12),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 6,
          wordMax: 12,
        }),
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: User A creates a post in that community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.user.posts.create(connection, {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 4,
          wordMax: 10,
        }),
        text_body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 8,
          sentenceMax: 15,
          wordMin: 3,
          wordMax: 8,
        }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 4: User A comments on the post
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.user.comments.create(connection, {
      body: {
        post_id: post.id,
        body: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 8,
          wordMax: 14,
        }),
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment);

  // Step 5: User B registers (to test access control)
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userB: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userBEmail,
        password: "Password456!",
        display_name: RandomGenerator.name(),
        ip: null,
        href: "https://community-app.test/register",
        referrer: "https://community-app.test/landing",
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(userB);

  // Step 6: User B attempts to append an edit history to User A's comment (should be rejected)
  await TestValidator.error(
    "non-author cannot append comment edit history",
    async () => {
      await api.functional.communityPlatform.user.comments.editHistories.create(
        connection,
        {
          commentId: comment.id,
          body: {
            prior_body: comment.body,
            edit_reason: RandomGenerator.paragraph({
              sentences: 1,
              wordMin: 6,
              wordMax: 10,
            }),
          } satisfies ICommunityPlatformCommentEditHistory.ICreate,
        },
      );
    },
  );
}

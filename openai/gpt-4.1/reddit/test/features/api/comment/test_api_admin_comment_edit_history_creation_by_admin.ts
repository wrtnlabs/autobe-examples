import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentEditHistory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLinks } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLinks";
import type { ICommunityPlatformPostTexts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTexts";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validates that an admin can append an edit history to any user's comment in
 * the moderation/audit workflow.
 *
 * 1. Admin registration
 * 2. User registration
 * 3. User creates a community
 * 4. User creates a post in the community
 * 5. User adds a comment to the post
 * 6. Admin appends an edit history record to that comment with a reason
 */
export async function test_api_admin_comment_edit_history_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const admin_email = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: admin_email,
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        href: "https://platform.admin.register",
        referrer: "https://referrer.admin.register",
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. User registration
  const user_email = typia.random<string & tags.Format<"email">>();
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: user_email,
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        href: "https://platform.user.register",
        referrer: "https://referrer.user.register",
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(user);

  // 3. User creates community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: RandomGenerator.alphabets(8).toLowerCase(),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);

  // 4. User creates a post
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.user.posts.create(connection, {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        text_body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 5. User adds a comment
  const comment_body = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 5,
    wordMax: 15,
  });
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.user.comments.create(connection, {
      body: {
        post_id: post.id,
        body: comment_body,
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment);

  // 6. Admin appends edit history to the user's comment
  // Now switch back to admin (token is still valid as admin registration is first)
  const edit_reason = "Moderator correction due to guideline violation.";
  const edit_history: ICommunityPlatformCommentEditHistory =
    await api.functional.communityPlatform.admin.comments.editHistories.create(
      connection,
      {
        commentId: comment.id,
        body: {
          prior_body: comment.body,
          edit_reason,
        } satisfies ICommunityPlatformCommentEditHistory.ICreate,
      },
    );
  typia.assert(edit_history);

  // Validation: audit trail record created and the content is accurate
  TestValidator.equals(
    "edit_history is for the right comment",
    edit_history.comment_id,
    comment.id,
  );
  TestValidator.equals(
    "edit_history prior_body matches comment body",
    edit_history.prior_body,
    comment.body,
  );
  TestValidator.equals(
    "edit_history edit_reason",
    edit_history.edit_reason,
    edit_reason,
  );
}

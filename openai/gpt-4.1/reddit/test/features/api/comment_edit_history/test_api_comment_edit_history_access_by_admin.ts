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
 * Verify administrator access to comment edit history records regardless of
 * ownership.
 *
 * Business Context: Administrators must be able to audit comment edit histories
 * for all users to ensure transparency and for compliance with moderation
 * workflows. This test simulates a real user journey from registration to
 * comment editing, then authenticates as an admin to check retrievability of
 * the comment's specific edit history snapshot.
 *
 * Step-by-Step Workflow:
 *
 * 1. Register a new platform admin (public endpoint)
 * 2. Register a standard user (public endpoint)
 * 3. User creates a new community
 * 4. User creates a post in that community (as text post)
 * 5. User creates a comment on that post
 * 6. User edits the comment, creating a new edit history snapshot
 * 7. Switch to admin session
 * 8. Admin fetches the newly created comment edit history and validates audit
 *    fields
 * 9. Assert that returned history matches original comment, edit context, and
 *    admin can view all details
 */
export async function test_api_comment_edit_history_access_by_admin(
  connection: api.IConnection,
) {
  // 1. Register new admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminDisplayName = RandomGenerator.name();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: adminDisplayName,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Register a standard user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(10);
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(user);

  // 3. User creates a new community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 8,
          wordMax: 16,
        }),
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);

  // 4. User creates a text post in the community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.user.posts.create(connection, {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 5,
          wordMax: 14,
        }),
        text_body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 8,
          sentenceMax: 16,
          wordMin: 2,
          wordMax: 12,
        }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 5. User creates a comment on the post
  const commentBody = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 12,
    wordMax: 15,
  });
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.user.comments.create(connection, {
      body: {
        post_id: post.id,
        body: commentBody,
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment);

  // 6. User edits the comment. This creates an edit history snapshot.
  const editReason = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 10,
  });
  const priorBody = comment.body;
  const history: ICommunityPlatformCommentEditHistory =
    await api.functional.communityPlatform.user.comments.editHistories.create(
      connection,
      {
        commentId: comment.id,
        body: {
          prior_body: priorBody,
          edit_reason: editReason,
        } satisfies ICommunityPlatformCommentEditHistory.ICreate,
      },
    );
  typia.assert(history);

  // 7. Switch to admin session by re-authenticating as admin (overwrites connection header)
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: adminDisplayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformAdmin.ICreate,
  });

  // 8. Admin fetches the edit history of the comment
  const fetchedEditHistory: ICommunityPlatformCommentEditHistory =
    await api.functional.communityPlatform.admin.comments.editHistories.at(
      connection,
      {
        commentId: comment.id,
        editHistoryId: history.id,
      },
    );
  typia.assert(fetchedEditHistory);

  // 9. Validate audit trail and data access
  TestValidator.equals(
    "admin fetched edit history matches the created snapshot",
    fetchedEditHistory,
    history,
  );
  TestValidator.equals(
    "admin can see correct prior comment body",
    fetchedEditHistory.prior_body,
    priorBody,
  );
  TestValidator.equals(
    "edit reason is correct",
    fetchedEditHistory.edit_reason,
    editReason,
  );
  TestValidator.equals(
    "edit history is linked to correct comment",
    fetchedEditHistory.comment_id,
    comment.id,
  );
}

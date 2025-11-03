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
 * Validate that an authenticated comment author can retrieve a specific edit
 * history for their own comment.
 *
 * 1. Register and authenticate a user (owner of all created entities).
 * 2. Create a community as this user.
 * 3. Create a text post in the community.
 * 4. Add a comment to the post.
 * 5. Edit the comment (generating an edit history), including a reason.
 * 6. Read the specific edit history version as the comment owner.
 * 7. Assert that the edit history contains the prior (original) body, editor's
 *    user/session, and supplied reason.
 */
export async function test_api_comment_edit_history_access_by_owner(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a user.
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const displayName = RandomGenerator.name();
  const href = "https://test.community/join";
  const referrer = "https://test.community/landing";
  const joinUser: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password,
        display_name: displayName,
        href,
        referrer,
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(joinUser);

  // 2. Create a community
  const communityName = RandomGenerator.alphaNumeric(12).toLowerCase();
  const description = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 4,
    wordMax: 12,
  });
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: communityName,
        description,
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);

  // 3. Create a text post
  const postTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 12,
  });
  const postBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 6,
    sentenceMax: 20,
    wordMin: 3,
    wordMax: 9,
  });
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.user.posts.create(connection, {
      body: {
        community_id: community.id,
        title: postTitle,
        text_body: postBody,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 4. Comment on the post
  const commentBody = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
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

  // 5. Edit the comment to generate an edit history
  const newCommentBody = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 6,
    wordMax: 14,
  });
  const editReason = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const editHistory: ICommunityPlatformCommentEditHistory =
    await api.functional.communityPlatform.user.comments.editHistories.create(
      connection,
      {
        commentId: comment.id,
        body: {
          prior_body: comment.body,
          edit_reason: editReason,
        } satisfies ICommunityPlatformCommentEditHistory.ICreate,
      },
    );
  typia.assert(editHistory);

  // 6. Retrieve the edit history record as comment owner
  const fetchedHistory: ICommunityPlatformCommentEditHistory =
    await api.functional.communityPlatform.user.comments.editHistories.at(
      connection,
      {
        commentId: comment.id,
        editHistoryId: editHistory.id,
      },
    );
  typia.assert(fetchedHistory);

  // 7. Validate expected fields in the edit history record
  TestValidator.equals(
    "returned edit history id matches",
    fetchedHistory.id,
    editHistory.id,
  );
  TestValidator.equals(
    "returned edit history prior_body matches original comment",
    fetchedHistory.prior_body,
    comment.body,
  );
  TestValidator.equals(
    "edit history editor_user_id is the comment owner",
    fetchedHistory.editor_user_id,
    joinUser.id,
  );
  TestValidator.equals(
    "edit history reason stored and returned",
    fetchedHistory.edit_reason,
    editReason,
  );
}

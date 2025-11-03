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
 * Validate that a user can append an edit history to their own comment.
 *
 * This end-to-end test covers the following workflow with all audit and
 * ownership requirements:
 *
 * 1. User registers and authenticates using /auth/user/join.
 * 2. User creates a new community as creator.
 * 3. User creates a text post inside the created community.
 * 4. User posts a comment on this post.
 * 5. User submits a new edit history record for their own comment, providing the
 *    prior body and an optional edit reason.
 *
 * The test asserts that the edit history is correctly appended, the audit trail
 * fields (user/session IDs, comment reference) match, and only the author can
 * perform this action.
 */
export async function test_api_comment_edit_history_creation_by_user(
  connection: api.IConnection,
) {
  // 1. User registration and authentication
  const userInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    ip: undefined,
    href: "https://e2e.test/app/register",
    referrer: "https://e2e.test/app/landing",
  } satisfies ICommunityPlatformUser.IJoin;

  const userAuth = await api.functional.auth.user.join(connection, {
    body: userInput,
  });
  typia.assert(userAuth);

  // 2. Create a new community
  const communityBody = {
    name: RandomGenerator.alphabets(10).toLowerCase(),
    description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 12,
    }),
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);
  TestValidator.equals(
    "community creator equals authenticated user",
    community.creator_user_id,
    userAuth.id,
  );

  // 3. Create a text post in the community
  const postBody = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 10 }),
    text_body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 7,
      wordMin: 3,
      wordMax: 10,
    }),
  } satisfies ICommunityPlatformPost.ICreate;

  const post = await api.functional.communityPlatform.user.posts.create(
    connection,
    { body: postBody },
  );
  typia.assert(post);
  TestValidator.equals(
    "post belongs to created community",
    post.community.id,
    community.id,
  );

  // 4. Post a comment on the post
  const commentBody = {
    post_id: post.id,
    body: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
  } satisfies ICommunityPlatformComment.ICreate;

  const comment = await api.functional.communityPlatform.user.comments.create(
    connection,
    { body: commentBody },
  );
  typia.assert(comment);
  TestValidator.equals("comment post ref", comment.post_id, post.id);
  TestValidator.equals("comment user id = user", comment.user_id, userAuth.id);

  // 5. Append an edit history record for this comment
  const editReason = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 10,
  });
  const editHistoryBody = {
    prior_body: comment.body,
    edit_reason: editReason,
  } satisfies ICommunityPlatformCommentEditHistory.ICreate;

  const editHistory =
    await api.functional.communityPlatform.user.comments.editHistories.create(
      connection,
      {
        commentId: comment.id,
        body: editHistoryBody,
      },
    );
  typia.assert(editHistory);
  TestValidator.equals(
    "editHistory should reference same comment",
    editHistory.comment_id,
    comment.id,
  );
  TestValidator.equals(
    "edit history editor is author",
    editHistory.editor_user_id,
    userAuth.id,
  );
  TestValidator.predicate(
    "edit history prior_body matches original",
    editHistory.prior_body === comment.body,
  );
  TestValidator.equals(
    "edit history edit_reason",
    editHistory.edit_reason,
    editReason,
  );
  TestValidator.predicate(
    "editor_user_session_id populated",
    typeof editHistory.editor_user_session_id === "string" &&
      editHistory.editor_user_session_id.length > 0,
  );
  TestValidator.predicate(
    "edit history created_at populated",
    typeof editHistory.created_at === "string" &&
      editHistory.created_at.length > 0,
  );
}

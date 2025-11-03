import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLinks } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLinks";
import type { ICommunityPlatformPostTexts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTexts";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Test that the author of a comment can edit their comment's content within the
 * allowed edit window.
 *
 * This test ensures that a user who authored a comment is able to edit their
 * comment's contents within the permitted edit window (such as 30 minutes after
 * creation). The test executes and validates the following flow:
 *
 * 1. Register a new user
 * 2. Create a new community
 * 3. Create a new text post under the community
 * 4. Write a new comment as the registered user on the post
 * 5. Edit the comment as the same user within the edit policy period
 *
 * Validates:
 *
 * - The comment content is updated after editing
 * - Audit metadata (created_at, updated_at, author) is consistent
 * - Attempting to retrieve previous body from edit history is possible (if
 *   available)
 * - Editing is only allowed within the allowed period, but late editing attempts
 *   are not tested here
 */
export async function test_api_comment_edit_by_author(
  connection: api.IConnection,
) {
  // 1. Register a user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userJoinBody = {
    email: userEmail,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://test-auth.community-platform.com/signup",
    referrer: "https://test-landingpage.com/referral",
  } satisfies ICommunityPlatformUser.IJoin;
  const userAuth: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userJoinBody });
  typia.assert(userAuth);
  // 2. Create a community
  const communityBody = {
    name: RandomGenerator.alphaNumeric(12).toLowerCase(),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 12,
    }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);
  // 3. Create a post (simple text post)
  const postBody = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 6, wordMax: 14 }),
    text_body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await api.functional.communityPlatform.user.posts.create(
    connection,
    { body: postBody },
  );
  typia.assert(post);
  // 4. Write a new comment as this user
  const commentBody = {
    post_id: post.id,
    body: RandomGenerator.paragraph({ sentences: 2, wordMin: 8, wordMax: 15 }),
  } satisfies ICommunityPlatformComment.ICreate;
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.user.comments.create(connection, {
      body: commentBody,
    });
  typia.assert(comment);
  // 5. Edit the comment as the same user, within the edit window
  const editedText = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 9,
    wordMax: 20,
  });
  const updateBody = {
    body: editedText,
  } satisfies ICommunityPlatformComment.IUpdate;
  const updated: ICommunityPlatformComment =
    await api.functional.communityPlatform.user.comments.update(connection, {
      commentId: comment.id,
      body: updateBody,
    });
  typia.assert(updated);

  // Validate updated content
  TestValidator.notEquals(
    "comment updated_at must differ after edit",
    updated.updated_at,
    comment.updated_at,
  );
  TestValidator.notEquals(
    "comment body changed after edit",
    updated.body,
    comment.body,
  );
  TestValidator.equals("post id stays the same", updated.post_id, post.id);
  TestValidator.equals(
    "author stays the same",
    updated.user_id,
    comment.user_id,
  );
  TestValidator.equals(
    "nest depth is preserved",
    updated.nest_depth,
    comment.nest_depth,
  );

  // updated comment's body matches edited body
  TestValidator.equals("body matches edited body", updated.body, editedText);
  // audit metadata
  TestValidator.predicate(
    "updated_at must be later than created_at",
    new Date(updated.updated_at).getTime() >
      new Date(updated.created_at).getTime(),
  );
  // edit window audit: should be allowed (edit success implies policy passes)
}

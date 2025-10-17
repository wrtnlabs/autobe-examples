import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test comment editing validation constraints including character limits.
 *
 * Validates that the comment editing API properly enforces content validation
 * constraints including minimum (1 character) and maximum (10,000 characters)
 * length requirements. Creates complete workflow: member registration,
 * community creation, post creation, comment creation, and then tests various
 * edit scenarios with different content lengths to ensure validation works
 * correctly.
 *
 * Steps:
 *
 * 1. Register a new member account for authentication
 * 2. Create a community to host content
 * 3. Create a post within the community
 * 4. Create an initial comment on the post
 * 5. Edit comment with valid mid-range content
 * 6. Edit comment with minimum valid length (1 character)
 * 7. Edit comment with maximum valid length (10,000 characters)
 * 8. Verify edited flag is set correctly
 */
export async function test_api_comment_edit_validation_constraints(
  connection: api.IConnection,
) {
  // Step 1: Register member account
  const memberData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create community
  const communityData = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 7,
    }),
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Create post in community
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 4: Create initial comment
  const initialCommentContent = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });
  const commentData = {
    reddit_like_post_id: post.id,
    content_text: initialCommentContent,
  } satisfies IRedditLikeComment.ICreate;

  const comment: IRedditLikeComment =
    await api.functional.redditLike.member.comments.create(connection, {
      body: commentData,
    });
  typia.assert(comment);
  TestValidator.equals(
    "initial comment content matches",
    comment.content_text,
    initialCommentContent,
  );
  TestValidator.equals("initial edited flag is false", comment.edited, false);

  // Step 5: Edit comment with valid mid-range content
  const validEditContent = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 8,
    sentenceMax: 15,
  });
  const editData1 = {
    content_text: validEditContent,
  } satisfies IRedditLikeComment.IUpdate;

  const editedComment1: IRedditLikeComment =
    await api.functional.redditLike.member.comments.update(connection, {
      commentId: comment.id,
      body: editData1,
    });
  typia.assert(editedComment1);
  TestValidator.equals(
    "edited content matches valid content",
    editedComment1.content_text,
    validEditContent,
  );
  TestValidator.equals(
    "edited flag is true after edit",
    editedComment1.edited,
    true,
  );

  // Step 6: Edit with minimum valid length (1 character)
  const minLengthContent = "a";
  const editData2 = {
    content_text: minLengthContent,
  } satisfies IRedditLikeComment.IUpdate;

  const editedComment2: IRedditLikeComment =
    await api.functional.redditLike.member.comments.update(connection, {
      commentId: comment.id,
      body: editData2,
    });
  typia.assert(editedComment2);
  TestValidator.equals(
    "minimum length content accepted",
    editedComment2.content_text,
    minLengthContent,
  );
  TestValidator.equals("edited flag remains true", editedComment2.edited, true);

  // Step 7: Edit with maximum valid length (10,000 characters)
  const maxLengthContent = ArrayUtil.repeat(10000, (i) =>
    RandomGenerator.pick([..."abcdefghijklmnopqrstuvwxyz0123456789 "]),
  ).join("");
  const editData3 = {
    content_text: maxLengthContent,
  } satisfies IRedditLikeComment.IUpdate;

  const editedComment3: IRedditLikeComment =
    await api.functional.redditLike.member.comments.update(connection, {
      commentId: comment.id,
      body: editData3,
    });
  typia.assert(editedComment3);
  TestValidator.equals(
    "maximum length content accepted",
    editedComment3.content_text.length,
    10000,
  );
  TestValidator.equals("edited flag still true", editedComment3.edited, true);
}

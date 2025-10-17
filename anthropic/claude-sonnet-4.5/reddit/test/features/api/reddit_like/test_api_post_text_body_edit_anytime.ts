import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test that post authors can edit the body text of text posts at any time
 * without time restrictions.
 *
 * This test validates the business requirement that text post body content can
 * be edited at any time after creation, unlike titles which have a 5-minute
 * editing window.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a new member account
 * 2. Create a community for posting
 * 3. Create a text post with initial body content
 * 4. Update the post body text to new content
 * 5. Validate that the update succeeds
 * 6. Verify updated_at timestamp changed
 * 7. Confirm title and post type remain unchanged
 */
export async function test_api_post_text_body_edit_anytime(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!@#",
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(member);

  // Step 2: Create a community where the post will be published
  const communityData = {
    code: RandomGenerator.alphaNumeric(12).toLowerCase(),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Create a text post with initial body content
  const initialBodyText = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 8,
    sentenceMax: 15,
  });
  const postTitle = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 7,
  });

  const postData = {
    community_id: community.id,
    type: "text",
    title: postTitle,
    body: initialBodyText,
  } satisfies IRedditLikePost.ICreate;

  const createdPost: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(createdPost);

  // Store original timestamps and properties for comparison
  const originalCreatedAt = createdPost.created_at;
  const originalUpdatedAt = createdPost.updated_at;
  const originalTitle = createdPost.title;
  const originalType = createdPost.type;

  // Step 4: Update the post body text to new content
  const updatedBodyText = RandomGenerator.content({
    paragraphs: 4,
    sentenceMin: 10,
    sentenceMax: 20,
  });

  const updateData = {
    body: updatedBodyText,
  } satisfies IRedditLikePost.IUpdate;

  const updatedPost: IRedditLikePost =
    await api.functional.redditLike.member.posts.update(connection, {
      postId: createdPost.id,
      body: updateData,
    });
  typia.assert(updatedPost);

  // Step 5: Validate that the update succeeded
  TestValidator.equals(
    "post ID remains the same",
    updatedPost.id,
    createdPost.id,
  );
  TestValidator.equals("post type remains text", updatedPost.type, "text");

  // Step 6: Verify updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at timestamp should be different after edit",
    updatedPost.updated_at,
    originalUpdatedAt,
  );

  // Step 7: Confirm title, type, and created_at remain unchanged
  TestValidator.equals(
    "title remains unchanged",
    updatedPost.title,
    originalTitle,
  );
  TestValidator.equals(
    "post type remains unchanged",
    updatedPost.type,
    originalType,
  );
  TestValidator.equals(
    "created_at timestamp unchanged",
    updatedPost.created_at,
    originalCreatedAt,
  );
}

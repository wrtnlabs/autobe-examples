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
 * Validate the basic workflow of comment creation in a community platform.
 *
 * This test performs the following steps:
 *
 * 1. Registers a new community platform user and obtains authentication
 * 2. Creates a new community
 * 3. Creates a new text-type post in the created community
 * 4. Adds a new top-level comment to the post
 * 5. Validates all references and metadata on the response
 *
 * Validations performed:
 *
 * - The comment is linked to the correct post and user
 * - The comment's "nest_depth" is 0 (top-level)
 * - "is_removed" is false
 * - The "body" respects the 2000-character limit
 * - No parent_comment_id (for top-level)
 * - Timestamps and IDs exist and are well-formed
 * - Typia.assert succeeds with no error
 */
export async function test_api_comment_creation_basic_flow(
  connection: api.IConnection,
) {
  // Step 1: Register a new user and obtain authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email: userEmail,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://platform.example.com/signup",
    referrer: "https://platform.example.com/home",
  } satisfies ICommunityPlatformUser.IJoin;
  const userAuthorized = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(userAuthorized);
  TestValidator.equals("user email", userAuthorized.email, joinBody.email);
  TestValidator.equals(
    "user display name",
    userAuthorized.display_name,
    joinBody.display_name,
  );

  // Step 2: Create a community
  const communityBody = {
    name: RandomGenerator.alphabets(12).toLowerCase(),
    description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);
  TestValidator.equals(
    "community creator matches user",
    community.creator_user_id,
    userAuthorized.id,
  );
  TestValidator.predicate(
    "community name matches naming rule",
    /^[a-z0-9_]{3,50}$/.test(community.name),
  );

  // Step 3: Create a text-type post in the community
  const postTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 6,
    wordMax: 12,
  });
  const postTextBody = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 10,
    sentenceMax: 30,
    wordMin: 4,
    wordMax: 8,
  });
  const postBody = {
    community_id: community.id,
    title: postTitle,
    text_body: postTextBody,
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await api.functional.communityPlatform.user.posts.create(
    connection,
    { body: postBody },
  );
  typia.assert(post);
  TestValidator.equals("post community id", post.community.id, community.id);
  TestValidator.equals("post author id", post.author.id, userAuthorized.id);
  TestValidator.equals("post title", post.title, postTitle);
  TestValidator.predicate(
    "post text is attached in text_content",
    post.text_content !== null && post.text_content.body === postTextBody,
  );

  // Step 4: Add a new top-level comment to the created post
  const commentBody = {
    post_id: post.id,
    body: RandomGenerator.paragraph({ sentences: 8, wordMin: 8, wordMax: 18 }),
  } satisfies ICommunityPlatformComment.ICreate;
  const comment = await api.functional.communityPlatform.user.comments.create(
    connection,
    { body: commentBody },
  );
  typia.assert(comment);
  // Validate references
  TestValidator.equals(
    "comment references correct post_id",
    comment.post_id,
    post.id,
  );
  TestValidator.equals("comment user_id", comment.user_id, userAuthorized.id);
  TestValidator.equals("comment nest_depth 0", comment.nest_depth, 0);
  TestValidator.equals("comment is_removed false", comment.is_removed, false);
  TestValidator.predicate(
    "comment id is uuid",
    typeof comment.id === "string" && /^[0-9a-f-]{36}$/.test(comment.id),
  );
  TestValidator.predicate(
    "comment session id is uuid",
    typeof comment.user_session_id === "string" &&
      /^[0-9a-f-]{36}$/.test(comment.user_session_id),
  );
  TestValidator.predicate(
    "comment created_at is date-time",
    typeof comment.created_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(
        comment.created_at,
      ),
  );
  TestValidator.equals(
    "no parent_comment_id on top-level comment",
    comment.parent_comment_id,
    null,
  );
  TestValidator.predicate(
    "body respects char limit",
    comment.body.length >= 1 && comment.body.length <= 2000,
  );
  // Confirm no unexpected fields (typia.assert already covers)
}

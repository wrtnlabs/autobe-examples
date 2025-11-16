import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

/**
 * Test that created posts are properly associated with their authoring members
 * through the author relationship. Validates that post authorship is correctly
 * maintained in the IRedditCommunityPost response with complete member summary
 * information, ensuring attribution accuracy and enabling proper author access
 * controls for subsequent post management operations.
 *
 * This comprehensive test ensures the Reddit Community platform's fundamental
 * authorship integrity by:
 *
 * 1. Creating a new member account with full authentication
 * 2. Creating a Reddit community post through that authenticated member
 * 3. Validating the post response contains proper author association with complete
 *    member summary data
 * 4. Verifying all expected author properties are present (unique ID, nickname,
 *    email, timestamps)
 * 5. Confirming the author relationship structure enables proper attribution for
 *    future content operations
 * 6. Testing that the post creation establishes correct foreign key relationships
 *    between posts and members
 *
 * The test validates the critical business requirement that every post must be
 * correctly attributed to its authoring member with complete summary
 * information, enabling proper access controls, content management, and
 * community moderation workflows throughout the platform.
 */
export async function test_api_post_creation_author_association_integrity(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member account to establish authentication context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberNickname = RandomGenerator.alphabets(10);
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        nickname: memberNickname,
        password: "SecurePass123!",
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a Reddit community post using the authenticated member
  // Generate community and post type IDs using UUIDs as specified in DTOs
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const postTypeId = typia.random<string & tags.Format<"uuid">>();

  const createBody = {
    title: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 8,
    }).substring(0, 50),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 15,
      sentenceMax: 25,
    }),
    reddit_community_id: communityId,
    reddit_post_type_id: postTypeId,
  } satisfies IRedditCommunityPost.ICreate;

  const createdPost: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: createBody,
    });
  typia.assert(createdPost);

  // Step 3: Validate that the created post contains proper author association
  TestValidator.equals(
    "post has correct title",
    createdPost.title,
    createBody.title,
  );
  TestValidator.equals(
    "post has correct content",
    createdPost.content,
    createBody.content,
  );
  TestValidator.equals(
    "post has correct community id",
    createdPost.community.id,
    communityId,
  );
  TestValidator.equals(
    "post has correct post type id",
    createdPost.post_type.id,
    postTypeId,
  );

  // Step 4: Verify the author field contains complete member summary information
  TestValidator.notEquals("author object exists", createdPost.author, null);

  // Validate author has all required IRedditCommunityMember.ISummary properties
  TestValidator.predicate(
    "author has valid UUID id",
    typia.is<string & tags.Format<"uuid">>(createdPost.author.id),
  );
  TestValidator.equals(
    "author nickname matches creator",
    createdPost.author.nickname,
    memberNickname,
  );
  TestValidator.equals(
    "author email matches creator",
    createdPost.author.email,
    memberEmail,
  );
  TestValidator.predicate(
    "author has created_at timestamp",
    typia.is<string & tags.Format<"date-time">>(createdPost.author.created_at),
  );

  // Validate that deleted_at is properly handled (null or undefined for active accounts)
  TestValidator.predicate(
    "author deleted_at is null for active account",
    createdPost.author.deleted_at === null ||
      createdPost.author.deleted_at === undefined,
  );

  // Step 5: Confirm the post initialization values are correct
  TestValidator.equals(
    "post initialized with zero upvote count",
    createdPost.upvote_count,
    0,
  );
  TestValidator.equals(
    "post initialized with zero downvote count",
    createdPost.downvote_count,
    0,
  );
  TestValidator.equals(
    "post initialized with zero view count",
    createdPost.view_count,
    0,
  );
  TestValidator.equals(
    "post initialized with zero comment count",
    createdPost.comment_count,
    0,
  );
  TestValidator.equals(
    "post is not locked by default",
    createdPost.is_locked,
    false,
  );
  TestValidator.equals(
    "post is not pinned by default",
    createdPost.is_pinned,
    false,
  );

  // Step 6: Validate basic post type properties (ensure object structure holds)
  TestValidator.equals(
    "post type id matches",
    createdPost.post_type.id,
    postTypeId,
  );
  TestValidator.predicate(
    "post type name is string",
    typeof createdPost.post_type.name === "string",
  );
  TestValidator.predicate(
    "post type allows_text_content is boolean",
    typeof createdPost.post_type.allows_text_content === "boolean",
  );
  TestValidator.predicate(
    "post type allows_links is boolean",
    typeof createdPost.post_type.allows_links === "boolean",
  );
  TestValidator.predicate(
    "post type requires_media is boolean",
    typeof createdPost.post_type.requires_media === "boolean",
  );

  // Step 7: Validate basic community properties (ensure object structure holds)
  TestValidator.equals(
    "community id matches",
    createdPost.community.id,
    communityId,
  );
  TestValidator.predicate(
    "community name is string",
    typeof createdPost.community.name === "string",
  );
  TestValidator.predicate(
    "community title is string",
    typeof createdPost.community.title === "string",
  );
  TestValidator.predicate(
    "community type is valid",
    createdPost.community.type === "public" ||
      createdPost.community.type === "restricted" ||
      createdPost.community.type === "private",
  );
  TestValidator.predicate(
    "community subscriber count is non-negative integer",
    createdPost.community.subscriber_count >= 0 &&
      Number.isInteger(createdPost.community.subscriber_count),
  );
}

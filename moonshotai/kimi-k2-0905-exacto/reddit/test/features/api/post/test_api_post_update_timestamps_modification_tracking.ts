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
 * Test that post updates correctly handle timestamp management, updating the
 * updated_at field while preserving the original created_at timestamp.
 * Validates the system's automatic timestamp tracking for audit purposes,
 * ensuring snapshot creation functionality works correctly to preserve edit
 * history for administrative review.
 *
 * This test validates the Reddit Community platform's timestamp tracking system
 * for post updates. The system must:
 *
 * 1. Update the updated_at field when post content changes
 * 2. Preserve the original created_at timestamp without modification
 * 3. Maintain proper ISO 8601 date-time format for all timestamps
 * 4. Support multiple updates with consistent timestamp behavior
 * 5. Ensure edited content is properly reflected while maintaining audit trail
 *
 * Test steps:
 *
 * 1. Member registration for authentication context
 * 2. Initial post creation with known timestamps
 * 3. Capture original timestamps for comparison
 * 4. Post content update operation
 * 5. Timestamp validation (updated_at changed, created_at preserved)
 * 6. Multiple update cycles to verify consistency
 * 7. Content validation alongside timestamp verification
 */
export async function test_api_post_update_timestamps_modification_tracking(
  connection: api.IConnection,
) {
  // 1. Register a new member to establish authentication context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        nickname: RandomGenerator.name(),
        password: `${RandomGenerator.alphabets(12)}A1!`,
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(member);

  // 2. Create initial post with basic structure
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const postTypeId = typia.random<string & tags.Format<"uuid">>();

  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
    reddit_community_id: communityId,
    reddit_post_type_id: postTypeId,
  } satisfies IRedditCommunityPost.ICreate;

  // Note: Store original timestamp immediately after creation
  let post: IRedditCommunityPost;
  const creationTime = Date.now();

  post = await api.functional.redditCommunity.member.posts.create(connection, {
    body: createBody,
  });
  typia.assert(post);

  // 3. Capture original timestamps from the created post
  TestValidator.predicate(
    "POST: creation timestamp should be present",
    post.created_at !== null && post.created_at !== undefined,
  );
  TestValidator.predicate(
    "POST: updated_at timestamp should be present",
    post.updated_at !== null && post.updated_at !== undefined,
  );

  TestValidator.equals(
    "POST: created_at and updated_at should be equal on creation",
    post.created_at,
    post.updated_at,
  );

  const originalCreatedAt = post.created_at;
  const originalUpdatedAt = post.updated_at;

  // 4. Ensure small time difference exists between actions
  await new Promise((resolve) => setTimeout(resolve, 150));

  // 5. Update post content
  const updatedContent = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 6,
    sentenceMax: 12,
    wordMin: 3,
    wordMax: 9,
  });
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 6 }),
    content: updatedContent,
  } satisfies IRedditCommunityPost.IUpdate;

  let updatedPost: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.update(connection, {
      postId: post.id,
      body: updateBody,
    });
  typia.assert(updatedPost);

  // 6. Validate timestamp modifications
  // updated_at should change
  TestValidator.notEquals(
    "POST: updated_at timestamp should change after update",
    updatedPost.updated_at,
    originalUpdatedAt,
  );

  // created_at should remain unchanged
  TestValidator.equals(
    "POST: created_at timestamp should be preserved",
    updatedPost.created_at,
    originalCreatedAt,
  );

  // updated_at should be newer than original time
  TestValidator.predicate(
    "POST: updated_at should be newer than original creation time",
    new Date(updatedPost.updated_at).getTime() >= creationTime + 100,
  );

  // 7. Update again to test consistency
  await new Promise((resolve) => setTimeout(resolve, 200));

  const secondUpdateBody = {
    content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IRedditCommunityPost.IUpdate;

  let secondUpdatedPost: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.update(connection, {
      postId: updatedPost.id,
      body: secondUpdateBody,
    });
  typia.assert(secondUpdatedPost);

  // 8. Validate second update preserved timestamps correctly
  TestValidator.predicate(
    "POST: second updated_at should be different from first",
    secondUpdatedPost.updated_at !== updatedPost.updated_at,
  );
  TestValidator.equals(
    "POST: created_at still preserved after second update",
    secondUpdatedPost.created_at,
    originalCreatedAt,
  );

  // 9. Test timestamp format validity
  TestValidator.predicate(
    "POST: all timestamps should be valid ISO 8601 format",
    () => {
      try {
        const createdDate = new Date(originalCreatedAt);
        return (
          createdDate instanceof Date &&
          !isNaN(createdDate.getTime()) &&
          /\d{4}-\d{2}-\d{2}/.test(originalCreatedAt)
        );
      } catch {
        return false;
      }
    },
  );

  TestValidator.predicate(
    "POST: updated_at should be valid ISO 8601 format",
    () => {
      try {
        const updatedDate = new Date(updatedPost.updated_at);
        return (
          updatedDate instanceof Date &&
          !isNaN(updatedDate.getTime()) &&
          /\d{4}-\d{2}-\d{2}/.test(updatedPost.updated_at)
        );
      } catch {
        return false;
      }
    },
  );

  // 10. Validate content was actually updated
  TestValidator.equals(
    "POST: content should be updated properly",
    updatedPost.content,
    updatedContent,
  );

  TestValidator.predicate(
    "POST: updated_at should be newer than created_at",
    new Date(updatedPost.updated_at).getTime() >=
      new Date(updatedPost.created_at).getTime(),
  );

  // 11. Verify consistent object structure across updates
  TestValidator.equals(
    "POST: ID should remain constant throughout updates",
    secondUpdatedPost.id,
    post.id,
  );
  TestValidator.equals(
    "POST: author should remain the same",
    secondUpdatedPost.author.id,
    member.id,
  );
  TestValidator.equals(
    "POST: community should remain the same",
    secondUpdatedPost.community.id,
    communityId,
  );
}

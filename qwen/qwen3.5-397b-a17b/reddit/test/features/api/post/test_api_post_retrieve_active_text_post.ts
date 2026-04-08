import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import type { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import type { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving an active text-type post by its UUID.
 *
 * Validates the complete post retrieval flow for text-type posts. Ensures that the response includes all required fields with correct types and values. Verifies that author and community information is correctly joined from their respective tables, timestamps are in ISO 8601 format, and the content body contains the full text content.
 *
 * Special attention is given to verifying the discriminated union content field contains the body property for text posts, and that the post is active (deletedAt is null).
 *
 * 1. Retrieves a text-type post by its UUID.
 * 2. Validates the response structure matches IRedditCommunityPost schema.
 * 3. Verifies postType is 'text' and deletedAt is null (active post).
 * 4. Confirms author and community summaries contain all required fields.
 * 5. Validates content.body exists and contains text content.
 * 6. Verifies voteScore and commentsCount are integers.
 * 7. Confirms timestamps are in ISO 8601 format.
 */
export async function test_api_post_retrieve_active_text_post(
  connection: api.IConnection,
): Promise<void> {
  // Retrieve the post by UUID
  const post = await api.functional.redditCommunity.posts.at(connection, {
    postId: typia.random<string & tags.Format<"uuid">>(),
  });
  // Validate complete response structure including all nested objects
  typia.assert(post);
  // Verify post type is text (business rule validation)
  TestValidator.equals("post type", post.postType, "text");
  // Verify post is active - not soft-deleted (business rule)
  TestValidator.equals("deletedAt is null", post.deletedAt, null);
  // Verify content exists for text post (discriminated union validation)
  TestValidator.predicate("content exists", post.content !== undefined);
  // Verify content has body field specific to text posts
  // Cast to text content type since postType is verified as "text"
  const textContent = post.content as IRedditCommunityPostTextContent;
  TestValidator.predicate("content has body", textContent.body !== undefined);
  // Verify author information is populated (JOIN validation)
  TestValidator.predicate("author id exists", post.author.id.length > 0);
  TestValidator.predicate(
    "author username exists",
    post.author.username.length > 0,
  );
  TestValidator.predicate(
    "author display_name exists",
    post.author.display_name.length > 0,
  );
  // Verify community information is populated (JOIN validation)
  TestValidator.predicate("community id exists", post.community.id.length > 0);
  TestValidator.predicate(
    "community name exists",
    post.community.name.length > 0,
  );
  TestValidator.predicate(
    "community description exists",
    post.community.description.length > 0,
  );
  // Verify engagement metrics are valid integers
  TestValidator.predicate(
    "voteScore is valid",
    Number.isInteger(post.voteScore),
  );
  TestValidator.predicate(
    "commentsCount is non-negative",
    post.commentsCount >= 0,
  );
}
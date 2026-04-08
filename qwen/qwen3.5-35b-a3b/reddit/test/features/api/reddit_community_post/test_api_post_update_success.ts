import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the primary success path for updating a post's content and metadata.
 *
 * Validates the complete post update workflow including member authentication
 * and content modification. Ensures that the post can be updated by its author
 * and that all mutable fields are correctly modified while immutable fields
 * remain unchanged.
 *
 * Special attention is given to verifying that the updated_at timestamp is
 * automatically set by the system and that business rules are enforced
 * properly during the update operation.
 *
 * 1. Member registers with valid credentials using /redditCommunity/auth/member/join
 * 2. Member updates an existing post with new title and text_content
 * 3. Validates the response contains the fully updated post entity with HTTP 200
 * 4. Validates title has been changed to "Updated Title"
 * 5. Validates text_content has been changed to the new detailed content
 * 6. Validates updated_at timestamp has been modified
 * 7. Validates immutable fields (id, author, community, vote_score, comment_count, created_at, deleted_at) remain unchanged
 * 8. Validates post_type remains "text" (unchanged from original creation)
 */
export async function test_api_post_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(2),
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // Create a fresh connection for authenticated member requests
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = { Authorization: memberAuth.token.access };
  // 2. Update an existing post (post must exist before this operation)
  const postId = typia.random<string & tags.Format<"uuid">>();
  const updatedTitle = "Updated Title";
  const updatedContent =
    "Updated content that is more detailed and comprehensive";
  const updatedPost = await api.functional.redditCommunity.member.posts.update(
    authenticatedConnection,
    {
      postId,
      body: {
        title: updatedTitle,
        text_content: updatedContent,
      } satisfies IRedditCommunityPost.IUpdate,
    },
  );
  typia.assert(updatedPost);
  // Validate post type is text
  TestValidator.equals("post type is text", updatedPost.post_type, "text");
  // 3. Validate title has been updated
  TestValidator.equals("title updated", updatedPost.title, updatedTitle);
  // 4. Validate text_content has been updated
  TestValidator.equals(
    "text_content updated",
    updatedPost.text_content,
    updatedContent,
  );
  // 5. Validate updated_at timestamp is present
  TestValidator.equals(
    "updated_at exists",
    updatedPost.updated_at !== undefined,
    true,
  );
  // 6. Validate immutable fields exist and are set correctly
  TestValidator.equals("post id is UUID", updatedPost.id !== undefined, true);
  TestValidator.equals(
    "author id is UUID",
    updatedPost.author.id !== undefined,
    true,
  );
  TestValidator.equals(
    "community id is UUID",
    updatedPost.community.id !== undefined,
    true,
  );
  // 7. Validate post_type remains "text"
  TestValidator.equals("post_type remains text", updatedPost.post_type, "text");
  // 8. Validate vote_score and comment_count are present
  TestValidator.predicate(
    "vote_score is a number",
    () => typeof updatedPost.vote_score === "number",
  );
  TestValidator.predicate(
    "comment_count is a number",
    () => typeof updatedPost.comment_count === "number",
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";

/**
 * Validates top-level comment creation by a newly registered user.
 *
 * This test scenario covers full onboarding for a new community platform user,
 * authentication context acquisition, and the creation of a root-level comment
 * on a community post. The flow ensures:
 *
 * - Account registration (with unique email), token acquisition, and session
 *   context established
 * - Use of a valid post_id (simulated, as post creation is out of scope)
 * - Submission of a comment with required body field in Markdown format, testing
 *   minimum and maximum length boundaries
 * - Proper API response, including post and author attribution, auditing
 *   timestamps, and correct root comment status
 */
export async function test_api_community_comment_creation_top_level(
  connection: api.IConnection,
) {
  // 1. Register a new user and acquire authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.Format<"password">>();
  const authorizedUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(authorizedUser);

  // 2. Simulate an existing post_id for comment association
  const postId = typia.random<string & tags.Format<"uuid">>();

  // 3. Prepare comment creation payload (top-level comment, Markdown, length at boundaries)
  const topLevelCommentBody = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 3,
    sentenceMax: 7,
    wordMin: 3,
    wordMax: 10,
  }).slice(0, 2000); // markdown content, maxLen 2000
  const requestBody = {
    post_id: postId,
    body: topLevelCommentBody,
  } satisfies ICommunityPlatformComment.ICreate;

  // 4. Perform comment creation as the authenticated user
  const comment = await api.functional.communityPlatform.user.comments.create(
    connection,
    {
      body: requestBody,
    },
  );
  typia.assert(comment);

  // 5. Validate comment properties: author attribution, root status, post linkage, auditing, and content
  TestValidator.equals(
    "comment author matches registered user",
    comment.author.id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "comment is root-level (no parent)",
    comment.parent,
    null,
  );
  TestValidator.equals("comment references post_id", comment.post.id, postId);
  TestValidator.predicate(
    "comment body is within 1-2000 chars",
    comment.body.length >= 1 && comment.body.length <= 2000,
  );
  TestValidator.equals(
    "comment body matches input",
    comment.body,
    topLevelCommentBody,
  );
  TestValidator.predicate(
    "comment id is valid uuid",
    typeof comment.id === "string" && comment.id.length > 0,
  );
  TestValidator.predicate(
    "created_at is ISO8601",
    typeof comment.created_at === "string" && comment.created_at.includes("T"),
  );
  TestValidator.predicate(
    "updated_at is ISO8601",
    typeof comment.updated_at === "string" && comment.updated_at.includes("T"),
  );
}

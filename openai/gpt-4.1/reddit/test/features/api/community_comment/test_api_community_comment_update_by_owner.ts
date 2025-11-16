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
 * Validates that a self-registered user can update their own comment.
 *
 * The test workflow:
 *
 * 1. Register a new user and authenticate (acquire token)
 * 2. Create a top-level comment for that user (with synthetic post_id)
 * 3. Update the comment's body text (with markdown and validated length)
 * 4. Ensure update occurred: body changed, updated_at is new, audit properties
 *    remain valid
 */
export async function test_api_community_comment_update_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new user (and authenticate)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformUser.IJoin;
  const user = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(user);
  // User's context is now authenticated in connection

  // 2. Create a top-level comment for the user (synthetic post_id)
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const commentBody = {
    post_id: postId,
    body: `Initial *markdown* body.`,
  } satisfies ICommunityPlatformComment.ICreate;
  const comment = await api.functional.communityPlatform.user.comments.create(
    connection,
    { body: commentBody },
  );
  typia.assert(comment);
  // Track audit state before update
  const { id: commentId, body: origBody, updated_at: origUpdatedAt } = comment;

  // 3. Update the comment
  const newBody = `Edited **body**\n\nWith [link](https://wrtn.ai/) and line breaks.`;
  const updateInput = {
    body: newBody,
  } satisfies ICommunityPlatformComment.IUpdate;
  const updated = await api.functional.communityPlatform.user.comments.update(
    connection,
    { commentId, body: updateInput },
  );
  typia.assert(updated);

  // 4. Assertions: body updated, updated_at is new, authorship/context retained
  TestValidator.notEquals(
    "comment body must be changed",
    updated.body,
    origBody,
  );
  TestValidator.equals("comment body must match input", updated.body, newBody);
  TestValidator.notEquals(
    "updated_at should change after edit",
    updated.updated_at,
    origUpdatedAt,
  );
  TestValidator.equals("comment id remains the same", updated.id, commentId);
  TestValidator.equals(
    "author of comment is still user",
    updated.author.id,
    user.id,
  );
  TestValidator.equals("post context unchanged", updated.post.id, postId);
  TestValidator.equals(
    "user session present",
    typeof updated.userSession.id,
    "string",
  );
  // No deleted_at after update
  TestValidator.equals(
    "comment is not deleted after update",
    updated.deleted_at ?? null,
    null,
  );
}

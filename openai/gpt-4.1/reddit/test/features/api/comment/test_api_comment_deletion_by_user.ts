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
 * Validate the deletion of a user-owned comment by the user.
 *
 * 1. Register a new user (obtain authentication).
 * 2. Create a comment (top-level, with random post_id and body).
 * 3. Delete the created comment as the same user.
 * 4. Assert that deletion does not throw error.
 * 5. Attempt to delete again and validate that error is thrown (comment does not
 *    exist).
 */
export async function test_api_comment_deletion_by_user(
  connection: api.IConnection,
) {
  // 1. Register a user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "Password123!";
  const userAuth = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userAuth);

  // 2. Create a comment as this user
  const postId = typia.random<string & tags.Format<"uuid">>();
  const commentBody = RandomGenerator.paragraph({
    sentences: 7,
    wordMin: 5,
    wordMax: 11,
  });
  const comment = await api.functional.communityPlatform.user.comments.create(
    connection,
    {
      body: {
        post_id: postId,
        body: commentBody,
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);
  TestValidator.equals("comment body matches", comment.body, commentBody);
  TestValidator.equals("comment post id matches", comment.post.id, postId);

  // 3. Delete the comment by id as the owner
  await api.functional.communityPlatform.user.comments.erase(connection, {
    commentId: comment.id,
  });

  // 4. Assert deletion by attempting to delete again (should error)
  await TestValidator.error(
    "deleting already deleted comment should error",
    async () => {
      await api.functional.communityPlatform.user.comments.erase(connection, {
        commentId: comment.id,
      });
    },
  );
}

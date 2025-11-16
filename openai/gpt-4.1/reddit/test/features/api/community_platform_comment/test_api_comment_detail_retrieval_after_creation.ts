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
 * E2E test: Retrieve comment detail after creation and validate all response
 * fields and error scenarios.
 *
 * 1. Register a new user via /auth/user/join (saves credentials).
 * 2. Create a comment via /communityPlatform/user/comments with random valid data
 *    (post_id is randomly generated).
 * 3. Retrieve the comment by ID via /communityPlatform/comments/{commentId}.
 * 4. Validate fields: body, author, parent (null/undefined), post reference,
 *    timestamps, and absence of deleted_at.
 * 5. Try retrieving a non-existent comment ID and assert error is thrown.
 */
export async function test_api_comment_detail_retrieval_after_creation(
  connection: api.IConnection,
) {
  // 1. Register new user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);

  // 2. Prepare input for comment creation (generate random post_id)
  const postId = typia.random<string & tags.Format<"uuid">>();
  const commentBody = RandomGenerator.paragraph({
    sentences: 8,
    wordMin: 5,
    wordMax: 16,
  });

  const createInput = {
    post_id: postId,
    body: commentBody,
  } satisfies ICommunityPlatformComment.ICreate;

  const createdComment =
    await api.functional.communityPlatform.user.comments.create(connection, {
      body: createInput,
    });
  typia.assert(createdComment);

  // 3. Retrieve the comment by its returned ID
  const retrieved = await api.functional.communityPlatform.comments.at(
    connection,
    {
      commentId: createdComment.id,
    },
  );
  typia.assert(retrieved);

  // 4. Assertions and field checks
  TestValidator.equals("comment body matches", retrieved.body, commentBody);
  TestValidator.equals("post reference ID matches", retrieved.post.id, postId);
  TestValidator.equals("author ID matches user", retrieved.author.id, user.id);
  TestValidator.equals("parent is null or undefined", retrieved.parent, null);
  TestValidator.equals(
    "deleted_at is null or undefined",
    retrieved.deleted_at ?? null,
    null,
  );
  TestValidator.predicate(
    "created_at is ISO string",
    typeof retrieved.created_at === "string" &&
      retrieved.created_at.includes("T"),
  );
  TestValidator.predicate(
    "updated_at is ISO string",
    typeof retrieved.updated_at === "string" &&
      retrieved.updated_at.includes("T"),
  );
  TestValidator.equals(
    "creation and update timestamps match",
    retrieved.created_at,
    retrieved.updated_at,
  );

  // 5. Try to retrieve a non-existent comment
  await TestValidator.error(
    "retrieving non-existent comment should throw",
    async () => {
      await api.functional.communityPlatform.comments.at(connection, {
        commentId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}

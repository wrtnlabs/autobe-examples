import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentBookmark";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Test successful creation of a comment bookmark by authenticated user.
 *
 * 1. Register a user through /auth/user/join (obtain an authenticated session).
 * 2. Simulate an existing comment id using a random UUID value.
 * 3. Create a bookmark for the comment by calling
 *    /communityPlatform/user/commentBookmarks (must succeed).
 * 4. Validate the response type, linkage to the user, correct comment id, and
 *    correct system-managed fields.
 * 5. Attempt to create a duplicate bookmark for the same comment as the same user
 *    (must reject as duplicates are not allowed).
 * 6. Optionally, simulate unauthenticated access (by creating a new connection
 *    with empty headers) and attempt to bookmark; expect rejection.
 */
export async function test_api_comment_bookmark_creation_by_user(
  connection: api.IConnection,
) {
  // 1. Register a new user and authenticate
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userJoin);

  // 2. Simulate an existing comment ID
  const commentId = typia.random<string & tags.Format<"uuid">>();

  // 3. Create a bookmark for the comment
  const bookmark =
    await api.functional.communityPlatform.user.commentBookmarks.create(
      connection,
      {
        body: {
          comment_id: commentId,
        } satisfies ICommunityPlatformCommentBookmark.ICreate,
      },
    );
  typia.assert(bookmark);
  TestValidator.equals(
    "bookmark.user_id set to joined user",
    bookmark.user_id,
    userJoin.id,
  );
  TestValidator.equals(
    "bookmark.comment_id matches",
    bookmark.comment_id,
    commentId,
  );
  TestValidator.predicate(
    "bookmark.created_at is ISO string",
    typeof bookmark.created_at === "string" &&
      bookmark.created_at.endsWith("Z"),
  );
  TestValidator.equals(
    "bookmark.deleted_at is null or undefined",
    bookmark.deleted_at ?? null,
    null,
  );

  // 4. Attempt to create a duplicate bookmark for the same comment as the same user (should reject)
  await TestValidator.error(
    "duplicate bookmark attempt should fail",
    async () => {
      await api.functional.communityPlatform.user.commentBookmarks.create(
        connection,
        {
          body: {
            comment_id: commentId,
          } satisfies ICommunityPlatformCommentBookmark.ICreate,
        },
      );
    },
  );

  // 5. Attempt to bookmark as unauthenticated (should reject)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot create bookmark",
    async () => {
      await api.functional.communityPlatform.user.commentBookmarks.create(
        unauthConn,
        {
          body: {
            comment_id: typia.random<string & tags.Format<"uuid">>(),
          } satisfies ICommunityPlatformCommentBookmark.ICreate,
        },
      );
    },
  );
}

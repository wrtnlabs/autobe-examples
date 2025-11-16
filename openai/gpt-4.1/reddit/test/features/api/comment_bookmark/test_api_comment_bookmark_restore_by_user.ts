import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentBookmark";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Test restoring a previously deleted (soft-deleted) comment bookmark by the
 * original user.
 *
 * This test covers the workflow:
 *
 * 1. Register a user (user1)
 * 2. Register another user (user2)
 * 3. User1 creates a comment bookmark
 * 4. User1 soft-deletes (sets deleted_at) their bookmark
 * 5. Validate that deleted_at is set (soft deletion)
 * 6. User1 restores the bookmark (sets deleted_at to null)
 * 7. Verify deleted_at is null and updated_at advanced
 * 8. User2 attempts to restore user1's bookmark and fails
 * 9. Unauthenticated request to restore bookmark and fails
 */
export async function test_api_comment_bookmark_restore_by_user(
  connection: api.IConnection,
) {
  // 1. Register user1
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user1Password = RandomGenerator.alphaNumeric(12);
  const user1: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: user1Email,
        password: user1Password,
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(user1);

  // 2. Register user2
  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2Password = RandomGenerator.alphaNumeric(12);
  const user2: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: user2Email,
        password: user2Password,
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(user2);

  // 3. Login as user1 (token should be set, optional in this flow as join sets it)
  // 4. Create a comment bookmark (simulate comment_id)
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const bookmark: ICommunityPlatformCommentBookmark =
    await api.functional.communityPlatform.user.commentBookmarks.create(
      connection,
      {
        body: {
          comment_id: commentId,
        } satisfies ICommunityPlatformCommentBookmark.ICreate,
      },
    );
  typia.assert(bookmark);
  TestValidator.equals("created bookmark is active", bookmark.deleted_at, null);

  // 5. Soft-delete the bookmark (set deleted_at to now)
  const now = new Date().toISOString();
  const softDeleted: ICommunityPlatformCommentBookmark =
    await api.functional.communityPlatform.user.commentBookmarks.update(
      connection,
      {
        commentBookmarkId: bookmark.id,
        body: {
          deleted_at: now,
        } satisfies ICommunityPlatformCommentBookmark.IUpdate,
      },
    );
  typia.assert(softDeleted);
  TestValidator.predicate("soft deleted_at is set", !!softDeleted.deleted_at);

  // 6. Restore the bookmark (set deleted_at to null)
  const restored: ICommunityPlatformCommentBookmark =
    await api.functional.communityPlatform.user.commentBookmarks.update(
      connection,
      {
        commentBookmarkId: bookmark.id,
        body: {
          deleted_at: null,
        } satisfies ICommunityPlatformCommentBookmark.IUpdate,
      },
    );
  typia.assert(restored);
  TestValidator.equals(
    "restored bookmark deleted_at is null",
    restored.deleted_at,
    null,
  );
  TestValidator.predicate(
    "updated_at advanced on restore",
    restored.updated_at !== bookmark.updated_at,
  );

  // 7. Switch to user2 and attempt to restore user1's bookmark (should error)
  await api.functional.auth.user.join(connection, {
    body: {
      email: user2Email,
      password: user2Password,
    } satisfies ICommunityPlatformUser.IJoin,
  }); // Ensure token context is switched
  await TestValidator.error(
    "user2 cannot restore user1's bookmark",
    async () => {
      await api.functional.communityPlatform.user.commentBookmarks.update(
        connection,
        {
          commentBookmarkId: bookmark.id,
          body: {
            deleted_at: null,
          } satisfies ICommunityPlatformCommentBookmark.IUpdate,
        },
      );
    },
  );

  // 8. Unauthenticated user cannot restore bookmark
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot restore bookmark",
    async () => {
      await api.functional.communityPlatform.user.commentBookmarks.update(
        unauthConn,
        {
          commentBookmarkId: bookmark.id,
          body: {
            deleted_at: null,
          } satisfies ICommunityPlatformCommentBookmark.IUpdate,
        },
      );
    },
  );
}

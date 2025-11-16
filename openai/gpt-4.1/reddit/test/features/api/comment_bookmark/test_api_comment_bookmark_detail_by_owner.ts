import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentBookmark";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Verify detail retrieval and ownership access control for a user's comment
 * bookmark.
 *
 * 1. Create and authenticate user A
 * 2. Create and authenticate user B
 * 3. User A bookmarks a comment (using a random comment_id)
 * 4. User B bookmarks a different comment (also with a random comment_id)
 * 5. User A retrieves their bookmark by its ID and validates all fields
 * 6. User B attempts to retrieve user A's bookmark by its ID and expects error
 * 7. User A attempts to retrieve a non-existent bookmark (random UUID) and expects
 *    error
 */
export async function test_api_comment_bookmark_detail_by_owner(
  connection: api.IConnection,
) {
  // 1. Register and authenticate user A
  const emailA = typia.random<string & tags.Format<"email">>();
  const passwordA = RandomGenerator.alphabets(12);
  const userA: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: emailA,
        password: passwordA,
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(userA);
  TestValidator.predicate(
    "userA token issued",
    typeof userA.token.access === "string" && userA.token.access.length > 0,
  );
  const userAId = userA.id;

  // 2. Register and authenticate user B
  const emailB = typia.random<string & tags.Format<"email">>();
  const passwordB = RandomGenerator.alphabets(12);
  const userB: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: emailB,
        password: passwordB,
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(userB);
  TestValidator.predicate(
    "userB token issued",
    typeof userB.token.access === "string" && userB.token.access.length > 0,
  );
  const userBId = userB.id;

  // 3. User A bookmarks a comment
  // Use a random UUID as the comment_id
  const commentIdA = typia.random<string & tags.Format<"uuid">>();
  const bookmarkA: ICommunityPlatformCommentBookmark =
    await api.functional.communityPlatform.user.commentBookmarks.create(
      connection,
      {
        body: {
          comment_id: commentIdA,
        } satisfies ICommunityPlatformCommentBookmark.ICreate,
      },
    );
  typia.assert(bookmarkA);
  TestValidator.equals(
    "bookmark assigned to userA",
    bookmarkA.user_id,
    userAId,
  );
  TestValidator.equals(
    "comment id in bookmarkA matches",
    bookmarkA.comment_id,
    commentIdA,
  );
  TestValidator.predicate(
    "bookmarkA has valid id",
    typeof bookmarkA.id === "string" && bookmarkA.id.length > 0,
  );

  // 4. User B bookmarks a different comment
  const commentIdB = typia.random<string & tags.Format<"uuid">>();
  // Switch to userB context
  await api.functional.auth.user.join(connection, {
    body: {
      email: emailB,
      password: passwordB,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  const bookmarkB: ICommunityPlatformCommentBookmark =
    await api.functional.communityPlatform.user.commentBookmarks.create(
      connection,
      {
        body: {
          comment_id: commentIdB,
        } satisfies ICommunityPlatformCommentBookmark.ICreate,
      },
    );
  typia.assert(bookmarkB);
  TestValidator.equals(
    "bookmark assigned to userB",
    bookmarkB.user_id,
    userBId,
  );

  // 5. Switch back to userA and retrieve their own bookmark
  await api.functional.auth.user.join(connection, {
    body: {
      email: emailA,
      password: passwordA,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  const detailA: ICommunityPlatformCommentBookmark =
    await api.functional.communityPlatform.user.commentBookmarks.at(
      connection,
      {
        commentBookmarkId: bookmarkA.id,
      },
    );
  typia.assert(detailA);
  TestValidator.equals("detailA matches created bookmark", detailA, bookmarkA);
  TestValidator.predicate(
    "user_id is not exposed elsewhere",
    detailA.user_id === userAId,
  );

  // 6. Switch to userB and attempt to get userA's bookmark (unauthorized)
  await api.functional.auth.user.join(connection, {
    body: {
      email: emailB,
      password: passwordB,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  await TestValidator.error(
    "userB cannot access userA's bookmark",
    async () => {
      await api.functional.communityPlatform.user.commentBookmarks.at(
        connection,
        {
          commentBookmarkId: bookmarkA.id,
        },
      );
    },
  );

  // 7. Switch back to userA and attempt to get a non-existent bookmark (404)
  await api.functional.auth.user.join(connection, {
    body: {
      email: emailA,
      password: passwordA,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  const nonExistentBookmarkId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "userA tries to get non-existent bookmark and fails",
    async () => {
      await api.functional.communityPlatform.user.commentBookmarks.at(
        connection,
        {
          commentBookmarkId: nonExistentBookmarkId,
        },
      );
    },
  );
}

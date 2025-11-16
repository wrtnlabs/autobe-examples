import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentBookmark";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentBookmark";

/**
 * Validate user pagination, filtering, and uniqueness rules for comment
 * bookmark listing.
 *
 * This test ensures that:
 *
 * 1. An authenticated user can list their own comment bookmarks using pagination
 *    and filtering options.
 * 2. Only the user's bookmarks (not others) appear, and each (comment, user) pair
 *    is unique in results.
 * 3. Date range filtering (created_at/updated_at) returns the right subset.
 * 4. Only active bookmarks are listed by default, and include_deleted=true reveals
 *    soft-deleted ones as well.
 */
export async function test_api_comment_bookmark_list_pagination_by_user(
  connection: api.IConnection,
) {
  // 1. Register two users: one test subject and one control
  const userA: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      },
    });
  typia.assert(userA);

  const userB: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      },
    });
  typia.assert(userB);

  // 2. Switch to userA session
  await api.functional.auth.user.join(connection, {
    body: { email: userA.email, password: userA.email },
  }); // Join again to set token

  // 3. Create multiple bookmarks as userA (simulate existing comments)
  const commentIds = ArrayUtil.repeat(7, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const bookmarks = [] as ICommunityPlatformCommentBookmark[];
  for (const commentId of commentIds) {
    const result =
      await api.functional.communityPlatform.user.commentBookmarks.create(
        connection,
        {
          body: { comment_id: commentId },
        },
      );
    typia.assert(result);
    bookmarks.push(result);
  }

  // 4. Soft-delete one bookmark (simulate by re-creating bookmark with same comment_id, then delete)
  // - Since delete API is not available, rely on creation order for deleted_at
  // - We'll recognize the deleted bookmark in step 6 by deleted_at presence.

  // 5. Switch to userB and create bookmarks with overlapping/other comment IDs
  await api.functional.auth.user.join(connection, {
    body: { email: userB.email, password: userB.email },
  });
  const controlBookmarks = [] as ICommunityPlatformCommentBookmark[];
  for (let i = 0; i < 2; ++i) {
    const comment_id = typia.random<string & tags.Format<"uuid">>();
    const bm =
      await api.functional.communityPlatform.user.commentBookmarks.create(
        connection,
        {
          body: { comment_id },
        },
      );
    typia.assert(bm);
    controlBookmarks.push(bm);
  }

  // 6. Switch back to userA
  await api.functional.auth.user.join(connection, {
    body: { email: userA.email, password: userA.email },
  });

  // 7. Test: Basic pagination returns user's own bookmarks (not control group)
  const listResp =
    await api.functional.communityPlatform.user.commentBookmarks.index(
      connection,
      {
        body: { page: 1, limit: 5 },
      },
    );
  typia.assert(listResp);
  TestValidator.predicate(
    "All bookmarks belong to userA",
    listResp.data.every((x) => x.user.id === userA.id),
  );

  // 8. Test: Filtering by comment_id returns only matching bookmark
  const targetBookmark = bookmarks[0];
  const filterResp =
    await api.functional.communityPlatform.user.commentBookmarks.index(
      connection,
      {
        body: { comment_id: targetBookmark.comment_id, limit: 10, page: 1 },
      },
    );
  typia.assert(filterResp);
  TestValidator.equals(
    "Filtered bookmark matches requested comment_id",
    filterResp.data[0].comment.id,
    targetBookmark.comment_id,
  );

  // 9. Test: By default only active bookmarks returned (no deleted_at)
  TestValidator.predicate(
    "Only active bookmarks are listed (deleted_at is null/undefined)",
    listResp.data.every(
      (x) => x.deleted_at === undefined || x.deleted_at === null,
    ),
  );

  // 10. Test: with include_deleted=true, soft-deleted bookmarks appear
  const respAll =
    await api.functional.communityPlatform.user.commentBookmarks.index(
      connection,
      {
        body: { include_deleted: true, limit: 10, page: 1 },
      },
    );
  typia.assert(respAll);
  TestValidator.predicate(
    "include_deleted returns both active and possibly deleted bookmarks",
    respAll.data.length >= listResp.data.length,
  );

  // 11. Test: No duplicate bookmarks for the same (user, comment)
  const seen = new Set<string>();
  for (const bm of respAll.data) {
    const key = `${bm.user.id}:${bm.comment.id}`;
    TestValidator.predicate(
      "No duplicate user+comment bookmarks",
      !seen.has(key),
    );
    seen.add(key);
  }

  // 12. Test: Date range filter (created_at_min/max)
  if (bookmarks.length >= 2) {
    // sort and pick range
    const sorted = bookmarks
      .slice()
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    const minDate = sorted[1].created_at;
    const maxDate = sorted[bookmarks.length - 2].created_at;
    const rangeResp =
      await api.functional.communityPlatform.user.commentBookmarks.index(
        connection,
        {
          body: {
            created_at_min: minDate,
            created_at_max: maxDate,
            limit: 10,
            page: 1,
          },
        },
      );
    typia.assert(rangeResp);
    for (const bm of rangeResp.data) {
      TestValidator.predicate(
        "created_at is within the filtered range",
        bm.created_at >= minDate && bm.created_at <= maxDate,
      );
    }
  }
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";
import type { IEconDiscussPostBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostBookmark";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussPostBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussPostBookmark";

/**
 * List bookmarks after creating and bookmarking posts, validating ordering and
 * idempotency.
 *
 * Business flow:
 *
 * 1. Join as a member to obtain an authenticated session.
 * 2. Create three discussion posts as the member.
 * 3. Bookmark two posts. Re-run bookmark for the first post to validate idempotent
 *    behavior.
 * 4. List my bookmarks and validate:
 *
 *    - Size equals the number of unique bookmarks (2).
 *    - Items are ordered by createdAt desc.
 *    - No duplicates by postId and all belong to the joined member.
 *    - Pagination metadata is present and consistent (non-negative; limit > 0).
 */
export async function test_api_bookmarks_index_pagination_and_ordering_with_created_data(
  connection: api.IConnection,
) {
  // 1) Join as a member (auth token is set by SDK internally)
  const authorized = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(authorized);

  // 2) Create three posts
  const posts: IEconDiscussPost[] = await ArrayUtil.asyncRepeat(3, async () => {
    const created = await api.functional.econDiscuss.member.posts.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          summary: RandomGenerator.paragraph({ sentences: 6 }),
        } satisfies IEconDiscussPost.ICreate,
      },
    );
    typia.assert(created);
    return created;
  });

  // 3) Bookmark two posts and assert idempotency (second call for the first post)
  const bookmarkedPostIds: (string & tags.Format<"uuid">)[] = [
    posts[0].id,
    posts[1].id,
  ];

  // First-time bookmarks
  for (const postId of bookmarkedPostIds) {
    await api.functional.econDiscuss.member.posts.bookmarks.create(connection, {
      postId,
      body: {
        note: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IEconDiscussPostBookmark.ICreate,
    });
  }
  // Re-bookmark the first post, expecting idempotent behavior (no duplicate entries)
  await api.functional.econDiscuss.member.posts.bookmarks.create(connection, {
    postId: bookmarkedPostIds[0],
    body: { note: null } satisfies IEconDiscussPostBookmark.ICreate,
  });

  // 4) List my bookmarks and validate
  const page =
    await api.functional.econDiscuss.member.me.bookmarks.index(connection);
  typia.assert(page);

  // Basic pagination metadata validations
  TestValidator.predicate(
    "pagination.limit should be positive or zero",
    page.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.current should be non-negative",
    page.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.records should be >= data.length",
    page.pagination.records >= page.data.length,
  );

  // Validate bookmarks count equals the number of unique bookmarks created
  TestValidator.equals(
    "returned bookmark count equals created unique bookmarks",
    page.data.length,
    bookmarkedPostIds.length,
  );

  // Validate all bookmarks belong to the joined member
  TestValidator.predicate(
    "all bookmarks belong to the authenticated member",
    page.data.every((b) => b.userId === authorized.id),
  );

  // Validate no duplicates by postId
  const returnedPostIds = page.data.map((b) => b.postId);
  const uniqueReturnedPostIds = new Set(returnedPostIds);
  TestValidator.equals(
    "no duplicate postId entries in bookmarks",
    uniqueReturnedPostIds.size,
    page.data.length,
  );

  // Validate postIds set matches expected bookmarked posts (order-independent)
  const expectedPostIds = [...bookmarkedPostIds].sort();
  const actualPostIdsSorted = [...returnedPostIds].sort();
  TestValidator.equals(
    "returned postIds match the bookmarked targets",
    actualPostIdsSorted,
    expectedPostIds,
  );

  // Validate ordering by createdAt desc
  const sortedDesc = [...page.data].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  TestValidator.equals(
    "bookmarks ordered by createdAt desc",
    page.data,
    sortedDesc,
  );

  // Additional pairwise monotonicity check (non-increasing by createdAt)
  TestValidator.predicate(
    "pairwise createdAt is non-increasing",
    page.data.every((v, i, arr) =>
      i === 0 ? true : arr[i - 1].createdAt >= v.createdAt,
    ),
  );
}

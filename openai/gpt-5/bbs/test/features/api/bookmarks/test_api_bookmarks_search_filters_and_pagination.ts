import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEEconDiscussBookmarkSortBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussBookmarkSortBy";
import type { IESortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IESortOrder";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";
import type { IEconDiscussPostBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostBookmark";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussPostBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussPostBookmark";

/**
 * Bookmarks search: filters, pagination, and stability.
 *
 * Validates member bookmark listing via PATCH /econDiscuss/member/me/bookmarks.
 * The test covers end-to-end flow: author creates posts, saver bookmarks posts
 * (with idempotency), optionally deletes one, and queries the listing with
 * filters and pagination. It asserts:
 *
 * - Ownership: only caller’s bookmarks are returned
 * - Idempotency: duplicate bookmark POSTs do not create duplicates
 * - Soft-deletion: deleted bookmark is excluded
 * - Ordering: stable createdAt descending
 * - Pagination: split results with page/pageSize and no overlaps
 */
export async function test_api_bookmarks_search_filters_and_pagination(
  connection: api.IConnection,
) {
  // Helper: verify createdAt is descending (non-increasing) within a page
  const assert_desc_createdAt = (
    title: string,
    data: IEconDiscussPostBookmark.ISummary[],
  ) => {
    for (let i = 1; i < data.length; i++) {
      const prev = new Date(data[i - 1].createdAt).getTime();
      const curr = new Date(data[i].createdAt).getTime();
      TestValidator.predicate(
        `${title} - createdAt[${i - 1}] >= createdAt[${i}]`,
        prev >= curr,
      );
    }
  };

  // 1) Register authorUser and create 3 posts
  const authorJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(1),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(authorJoin);

  const posts: IEconDiscussPost[] = [];
  for (let i = 0; i < 3; i++) {
    const created = await api.functional.econDiscuss.member.posts.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          summary: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEconDiscussPost.ICreate,
      },
    );
    typia.assert(created);
    posts.push(created);
  }

  // 2) Register saverUser (switches auth context)
  const saverJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(1),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(saverJoin);

  // 3) Saver bookmarks two posts (with a note on the first); re-bookmark same to ensure idempotency
  const notedPost = posts[0];
  const otherPost = posts[1];

  await api.functional.econDiscuss.member.posts.bookmarks.create(connection, {
    postId: notedPost.id,
    body: {
      note: RandomGenerator.paragraph({ sentences: 6 }),
    } satisfies IEconDiscussPostBookmark.ICreate,
  });
  // Idempotency: duplicate POST
  await api.functional.econDiscuss.member.posts.bookmarks.create(connection, {
    postId: notedPost.id,
    body: {
      note: RandomGenerator.paragraph({ sentences: 4 }), // updating note is provider-dependent; idempotent on (user,post)
    } satisfies IEconDiscussPostBookmark.ICreate,
  });

  await api.functional.econDiscuss.member.posts.bookmarks.create(connection, {
    postId: otherPost.id,
    body: {
      // no note
    } satisfies IEconDiscussPostBookmark.ICreate,
  });

  // 4) Optionally remove one bookmark (soft-deletion respected in listing)
  await api.functional.econDiscuss.member.posts.bookmarks.self.erase(
    connection,
    {
      postId: otherPost.id,
    },
  );

  // Also bookmark the 3rd post so we have 2 active bookmarks for pagination
  const thirdPost = posts[2];
  await api.functional.econDiscuss.member.posts.bookmarks.create(connection, {
    postId: thirdPost.id,
    body: {} satisfies IEconDiscussPostBookmark.ICreate,
  });

  // 5-A) Baseline listing with defaults (explicit small pagination)
  const baseline = await api.functional.econDiscuss.member.me.bookmarks.search(
    connection,
    {
      body: {
        page: 1,
        pageSize: 10,
        q: null,
        postId: null,
        hasNote: null,
        createdFrom: null,
        createdTo: null,
        sortBy: null,
        sortOrder: null,
      } satisfies IEconDiscussPostBookmark.IRequest,
    },
  );
  typia.assert(baseline);

  // Ownership: all entries belong to saverUser
  baseline.data.forEach((b, idx) =>
    TestValidator.equals(
      `baseline ownership at index ${idx}`,
      b.userId,
      saverJoin.id,
    ),
  );

  // Deleted bookmark must not appear
  TestValidator.predicate(
    "soft-deleted bookmark is excluded",
    baseline.data.every((b) => b.postId !== otherPost.id),
  );

  // No duplicates within a page (by postId)
  {
    const ids = baseline.data.map((b) => b.postId);
    const unique = new Set(ids);
    TestValidator.equals(
      "no duplicate postIds in baseline page",
      unique.size,
      ids.length,
    );
  }

  // Ordering: createdAt desc within the page
  assert_desc_createdAt("baseline order", baseline.data);

  // 5-B) Filter by postId (idempotency confirmation: exactly one entry)
  const byPost = await api.functional.econDiscuss.member.me.bookmarks.search(
    connection,
    {
      body: {
        page: 1,
        pageSize: 10,
        q: null,
        postId: notedPost.id,
        hasNote: null,
        createdFrom: null,
        createdTo: null,
        sortBy: null,
        sortOrder: null,
      } satisfies IEconDiscussPostBookmark.IRequest,
    },
  );
  typia.assert(byPost);
  TestValidator.equals(
    "postId filter returns single record",
    byPost.data.length,
    1,
  );
  if (byPost.data.length > 0) {
    TestValidator.equals(
      "postId filter matches target",
      byPost.data[0].postId,
      notedPost.id,
    );
  }

  // 5-C) Filter by hasNote=true (only bookmarks with notes)
  const withNote = await api.functional.econDiscuss.member.me.bookmarks.search(
    connection,
    {
      body: {
        page: 1,
        pageSize: 10,
        q: null,
        postId: null,
        hasNote: true,
        createdFrom: null,
        createdTo: null,
        sortBy: null,
        sortOrder: null,
      } satisfies IEconDiscussPostBookmark.IRequest,
    },
  );
  typia.assert(withNote);
  withNote.data.forEach((b, idx) =>
    TestValidator.predicate(
      `hasNote=true entry[${idx}] has note`,
      b.note !== null && b.note !== undefined && b.note.length >= 0,
    ),
  );
  TestValidator.predicate(
    "withNote results include noted post",
    withNote.data.some((b) => b.postId === notedPost.id),
  );

  // 5-D) Pagination across multiple pages (pageSize=1 → expect two distinct pages)
  const page1 = await api.functional.econDiscuss.member.me.bookmarks.search(
    connection,
    {
      body: {
        page: 1,
        pageSize: 1,
        q: null,
        postId: null,
        hasNote: null,
        createdFrom: null,
        createdTo: null,
        sortBy: null,
        sortOrder: null,
      } satisfies IEconDiscussPostBookmark.IRequest,
    },
  );
  typia.assert(page1);

  const page2 = await api.functional.econDiscuss.member.me.bookmarks.search(
    connection,
    {
      body: {
        page: 2,
        pageSize: 1,
        q: null,
        postId: null,
        hasNote: null,
        createdFrom: null,
        createdTo: null,
        sortBy: null,
        sortOrder: null,
      } satisfies IEconDiscussPostBookmark.IRequest,
    },
  );
  typia.assert(page2);

  // Page sizes
  TestValidator.predicate("page1 has at most 1 item", page1.data.length <= 1);
  TestValidator.predicate("page2 has at most 1 item", page2.data.length <= 1);

  // If both pages have items, they should be distinct and ordered properly
  if (page1.data.length === 1 && page2.data.length === 1) {
    TestValidator.notEquals(
      "page1 and page2 items differ",
      page1.data[0].id,
      page2.data[0].id,
    );

    const t1 = new Date(page1.data[0].createdAt).getTime();
    const t2 = new Date(page2.data[0].createdAt).getTime();
    TestValidator.predicate(
      "page1 item is newer or equal to page2 item",
      t1 >= t2,
    );
  }

  // Ownership checks on paged results as well
  page1.data.forEach((b, idx) =>
    TestValidator.equals(`page1 ownership[${idx}]`, b.userId, saverJoin.id),
  );
  page2.data.forEach((b, idx) =>
    TestValidator.equals(`page2 ownership[${idx}]`, b.userId, saverJoin.id),
  );
}

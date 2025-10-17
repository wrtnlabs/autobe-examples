import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumBookmark";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPost";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalForumBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumBookmark";

export async function test_api_bookmark_list_pagination_and_filters(
  connection: api.IConnection,
) {
  // 1) Administrator signs up and creates a category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPass1234",
        username: RandomGenerator.name(1),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      {
        body: {
          code: `cat-${RandomGenerator.alphaNumeric(4)}`,
          name: RandomGenerator.name(2),
          slug: `slug-${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph({ sentences: 5 }),
          is_moderated: false,
          requires_verification: false,
          order: 1,
        } satisfies IEconPoliticalForumCategory.ICreate,
      },
    );
  typia.assert(category);

  // 2) Registered user A joins and performs actions
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userA: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `user_a_${RandomGenerator.alphaNumeric(5)}`,
        email: userAEmail,
        password: "UserPass1234",
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(userA);

  // 3) User A creates a thread
  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: {
          category_id: category.id,
          title: RandomGenerator.paragraph({ sentences: 6 }),
          slug: `thread-${RandomGenerator.alphaNumeric(6)}`,
        } satisfies IEconPoliticalForumThread.ICreate,
      },
    );
  typia.assert(thread);

  // 4) User A creates multiple posts in the thread
  const post1: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      connection,
      {
        body: {
          thread_id: thread.id,
          content: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IEconPoliticalForumPost.ICreate,
      },
    );
  typia.assert(post1);

  const post2: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      connection,
      {
        body: {
          thread_id: thread.id,
          content: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IEconPoliticalForumPost.ICreate,
      },
    );
  typia.assert(post2);

  const post3: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      connection,
      {
        body: {
          thread_id: thread.id,
          content: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IEconPoliticalForumPost.ICreate,
      },
    );
  typia.assert(post3);

  // 5) User A creates bookmarks for the posts
  const bookmark1: IEconPoliticalForumBookmark =
    await api.functional.econPoliticalForum.registeredUser.bookmarks.create(
      connection,
      {
        body: {
          post_id: post1.id,
        } satisfies IEconPoliticalForumBookmark.ICreate,
      },
    );
  typia.assert(bookmark1);

  const bookmark2: IEconPoliticalForumBookmark =
    await api.functional.econPoliticalForum.registeredUser.bookmarks.create(
      connection,
      {
        body: {
          post_id: post2.id,
        } satisfies IEconPoliticalForumBookmark.ICreate,
      },
    );
  typia.assert(bookmark2);

  const bookmark3: IEconPoliticalForumBookmark =
    await api.functional.econPoliticalForum.registeredUser.bookmarks.create(
      connection,
      {
        body: {
          post_id: post3.id,
        } satisfies IEconPoliticalForumBookmark.ICreate,
      },
    );
  typia.assert(bookmark3);

  // 6) As user A: List bookmarks with pagination (page=1, limit=2)
  const page1: IPageIEconPoliticalForumBookmark.ISummary =
    await api.functional.econPoliticalForum.registeredUser.bookmarks.index(
      connection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IEconPoliticalForumBookmark.IRequest,
      },
    );
  typia.assert(page1);

  TestValidator.equals(
    "pagination: current page is 1",
    page1.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination: returned items count is less than or equal to limit",
    page1.data.length <= 2,
  );
  TestValidator.predicate(
    "business: returned bookmarks reference posts (post_id exists)",
    page1.data.every(
      (b) => typeof b.post_id === "string" && b.post_id.length > 0,
    ),
  );

  // 7) Filter by postId -> only bookmark for that post
  const filteredByPost: IPageIEconPoliticalForumBookmark.ISummary =
    await api.functional.econPoliticalForum.registeredUser.bookmarks.index(
      connection,
      {
        body: {
          postId: post1.id,
          page: 1,
          limit: 10,
        } satisfies IEconPoliticalForumBookmark.IRequest,
      },
    );
  typia.assert(filteredByPost);
  TestValidator.predicate(
    "filter: by postId returns only bookmarks for that post",
    filteredByPost.data.every((b) => b.post_id === post1.id),
  );

  // 8) Filter by threadId -> bookmarks whose posts belong to the thread
  const filteredByThread: IPageIEconPoliticalForumBookmark.ISummary =
    await api.functional.econPoliticalForum.registeredUser.bookmarks.index(
      connection,
      {
        body: {
          threadId: thread.id,
          page: 1,
          limit: 10,
        } satisfies IEconPoliticalForumBookmark.IRequest,
      },
    );
  typia.assert(filteredByThread);
  TestValidator.predicate(
    "filter: by thread returns at least one bookmark for thread",
    filteredByThread.data.length >= 1,
  );

  // 9) Capture user A's bookmark ids for later isolation checks
  const userABookmarkIds = Array.from(
    new Set([bookmark1.id, bookmark2.id, bookmark3.id]),
  );

  // 10) Create user B and bookmark a post (this will switch the connection token to user B)
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userB: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `user_b_${RandomGenerator.alphaNumeric(5)}`,
        email: userBEmail,
        password: "UserPass1234",
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(userB);

  const bookmarkB: IEconPoliticalForumBookmark =
    await api.functional.econPoliticalForum.registeredUser.bookmarks.create(
      connection,
      {
        body: {
          post_id: post1.id,
        } satisfies IEconPoliticalForumBookmark.ICreate,
      },
    );
  typia.assert(bookmarkB);

  // 11) As user B: list bookmarks for post1 and assert it contains bookmarkB and not user A's bookmark ids
  const bList: IPageIEconPoliticalForumBookmark.ISummary =
    await api.functional.econPoliticalForum.registeredUser.bookmarks.index(
      connection,
      {
        body: {
          postId: post1.id,
          page: 1,
          limit: 10,
        } satisfies IEconPoliticalForumBookmark.IRequest,
      },
    );
  typia.assert(bList);

  TestValidator.predicate(
    "ownership isolation: user B's list includes B's bookmark",
    bList.data.some((b) => b.id === bookmarkB.id),
  );
  TestValidator.predicate(
    "ownership isolation: user B does not see user A's bookmarks",
    bList.data.every((b) => userABookmarkIds.indexOf(b.id) === -1),
  );

  // 12) Edge case: filter that yields empty result returns an empty page
  const emptyUuid = typia.random<string & tags.Format<"uuid">>();
  const emptyResult: IPageIEconPoliticalForumBookmark.ISummary =
    await api.functional.econPoliticalForum.registeredUser.bookmarks.index(
      connection,
      {
        body: {
          postId: emptyUuid,
          page: 1,
          limit: 5,
        } satisfies IEconPoliticalForumBookmark.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "edge: empty filter returns zero items",
    emptyResult.data.length,
    0,
  );
}

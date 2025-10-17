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

export async function test_api_bookmark_search_and_owner_enforcement(
  connection: api.IConnection,
) {
  // 1) Administrator: create category
  const adminConn: api.IConnection = { ...connection, headers: {} };
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(adminConn, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "AdminPass123!",
        username: `admin_${RandomGenerator.alphaNumeric(6)}`,
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      adminConn,
      {
        body: {
          code: null,
          name: `Category ${RandomGenerator.name(2)}`,
          slug: `cat-${RandomGenerator.alphabets(6)}`,
          description: "Category for bookmark test",
          is_moderated: false,
          requires_verification: false,
          order: 1,
        } satisfies IEconPoliticalForumCategory.ICreate,
      },
    );
  typia.assert(category);

  // 2) User A: join, create thread, create posts, bookmark some posts
  const userAConn: api.IConnection = { ...connection, headers: {} };
  const userA: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(userAConn, {
      body: {
        username: `userA_${RandomGenerator.alphaNumeric(6)}`,
        email: typia.random<string & tags.Format<"email">>(),
        password: "UserPass12345",
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(userA);

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      userAConn,
      {
        body: {
          category_id: category.id,
          title: RandomGenerator.paragraph({ sentences: 6 }),
          slug: `thread-${RandomGenerator.alphabets(6)}`,
          status: "open",
        } satisfies IEconPoliticalForumThread.ICreate,
      },
    );
  typia.assert(thread);

  const posts: IEconPoliticalForumPost[] = await ArrayUtil.asyncRepeat(
    3,
    async () => {
      const p: IEconPoliticalForumPost =
        await api.functional.econPoliticalForum.registeredUser.posts.create(
          userAConn,
          {
            body: {
              thread_id: thread.id,
              content: RandomGenerator.content({
                paragraphs: 1,
                sentenceMin: 5,
                sentenceMax: 10,
              }),
            } satisfies IEconPoliticalForumPost.ICreate,
          },
        );
      typia.assert(p);
      return p;
    },
  );

  // User A bookmarks post[0] and post[2]
  const userABookmarks: IEconPoliticalForumBookmark[] = [];
  for (const p of [posts[0], posts[2]]) {
    const b: IEconPoliticalForumBookmark =
      await api.functional.econPoliticalForum.registeredUser.bookmarks.create(
        userAConn,
        {
          body: { post_id: p.id } satisfies IEconPoliticalForumBookmark.ICreate,
        },
      );
    typia.assert(b);
    userABookmarks.push(b);
  }

  // 3) User B: join and bookmark a different post (posts[1])
  const userBConn: api.IConnection = { ...connection, headers: {} };
  const userB: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(userBConn, {
      body: {
        username: `userB_${RandomGenerator.alphaNumeric(6)}`,
        email: typia.random<string & tags.Format<"email">>(),
        password: "UserPass54321",
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(userB);

  const bookmarkB: IEconPoliticalForumBookmark =
    await api.functional.econPoliticalForum.registeredUser.bookmarks.create(
      userBConn,
      {
        body: {
          post_id: posts[1].id,
        } satisfies IEconPoliticalForumBookmark.ICreate,
      },
    );
  typia.assert(bookmarkB);

  // 4) As user A: PATCH /bookmarks filter by postId and assert only A's bookmarks
  const pageByPost: IPageIEconPoliticalForumBookmark.ISummary =
    await api.functional.econPoliticalForum.registeredUser.bookmarks.index(
      userAConn,
      {
        body: {
          postId: userABookmarks[0].post_id,
          page: 1,
          limit: 20,
        } satisfies IEconPoliticalForumBookmark.IRequest,
      },
    );
  typia.assert(pageByPost);
  TestValidator.predicate(
    "filtered by postId returns only bookmarks for that post",
    pageByPost.data.every((d) => d.post_id === userABookmarks[0].post_id),
  );

  // 5) As user A: filter by threadId and assert results are within A's bookmarked posts
  const pageByThread: IPageIEconPoliticalForumBookmark.ISummary =
    await api.functional.econPoliticalForum.registeredUser.bookmarks.index(
      userAConn,
      {
        body: {
          threadId: thread.id,
          page: 1,
          limit: 50,
        } satisfies IEconPoliticalForumBookmark.IRequest,
      },
    );
  typia.assert(pageByThread);
  const allowedPostIds = userABookmarks.map((b) => b.post_id);
  TestValidator.predicate(
    "bookmarks returned for thread are only user A's bookmarks",
    pageByThread.data.every((d) => allowedPostIds.includes(d.post_id)),
  );

  // 6) As user A: attempt to retrieve the post that user B bookmarked -> expect no results
  const crossUserPage: IPageIEconPoliticalForumBookmark.ISummary =
    await api.functional.econPoliticalForum.registeredUser.bookmarks.index(
      userAConn,
      {
        body: {
          postId: posts[1].id, // post that B bookmarked
          page: 1,
          limit: 20,
        } satisfies IEconPoliticalForumBookmark.IRequest,
      },
    );
  typia.assert(crossUserPage);
  TestValidator.equals(
    "user A cannot see user B's bookmarks for a given post",
    crossUserPage.data.length,
    0,
  );

  // 7) Edge: filtering by non-existent postId returns empty result
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  const pageNonExist: IPageIEconPoliticalForumBookmark.ISummary =
    await api.functional.econPoliticalForum.registeredUser.bookmarks.index(
      userAConn,
      {
        body: {
          postId: fakeId,
          page: 1,
          limit: 10,
        } satisfies IEconPoliticalForumBookmark.IRequest,
      },
    );
  typia.assert(pageNonExist);
  TestValidator.equals(
    "filtering by non-existent postId yields empty data",
    pageNonExist.data.length,
    0,
  );
}

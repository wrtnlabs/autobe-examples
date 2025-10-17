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

export async function test_api_user_bookmarks_list_forbidden_other_user(
  connection: api.IConnection,
) {
  /**
   * Verify that a registered user cannot list another user's bookmarks.
   *
   * Workflow:
   *
   * 1. Create administrator account and obtain admin token (adminConn).
   * 2. Create two registered users: owner (ownerConn) and other user (otherConn).
   * 3. With admin token, create a category.
   * 4. With owner token, create a thread and a post, then bookmark that post.
   * 5. With other user's token, attempt to list owner's bookmarks and expect an
   *    error.
   * 6. With owner token, list bookmarks and ensure the created bookmark is
   *    present.
   */

  // --- Create separate connection contexts to isolate authorization tokens ---
  const adminConn: api.IConnection = { ...connection, headers: {} };
  const ownerConn: api.IConnection = { ...connection, headers: {} };
  const otherConn: api.IConnection = { ...connection, headers: {} };

  // 1) Administrator join
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(adminConn, {
      body: {
        email: adminEmail,
        password: "P@ssw0rd-Admin-123",
        username: RandomGenerator.alphaNumeric(8).toLowerCase(),
        display_name: RandomGenerator.name(2),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 2) Owner (registered user) join
  const ownerEmail: string = typia.random<string & tags.Format<"email">>();
  const owner: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(ownerConn, {
      body: {
        username: RandomGenerator.alphaNumeric(8).toLowerCase(),
        email: ownerEmail,
        password: "P@ssw0rd-Owner-123",
        display_name: RandomGenerator.name(2),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(owner);

  // 3) Other registered user join
  const otherEmail: string = typia.random<string & tags.Format<"email">>();
  const otherUser: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(otherConn, {
      body: {
        username: RandomGenerator.alphaNumeric(8).toLowerCase(),
        email: otherEmail,
        password: "P@ssw0rd-Other-123",
        display_name: RandomGenerator.name(2),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(otherUser);

  // 4) Admin creates a category
  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      adminConn,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 6 }),
          is_moderated: false,
          requires_verification: false,
          order: 1,
        } satisfies IEconPoliticalForumCategory.ICreate,
      },
    );
  typia.assert(category);

  // 5) Owner creates a thread
  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      ownerConn,
      {
        body: {
          category_id: category.id,
          title: RandomGenerator.paragraph({
            sentences: 6,
            wordMin: 3,
            wordMax: 8,
          }),
          slug: RandomGenerator.alphaNumeric(10).toLowerCase(),
        } satisfies IEconPoliticalForumThread.ICreate,
      },
    );
  typia.assert(thread);

  // 6) Owner creates a post in the thread
  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      ownerConn,
      {
        body: {
          thread_id: thread.id,
          content: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IEconPoliticalForumPost.ICreate,
      },
    );
  typia.assert(post);

  // 7) Owner creates a bookmark for the post
  const bookmark: IEconPoliticalForumBookmark =
    await api.functional.econPoliticalForum.registeredUser.bookmarks.create(
      ownerConn,
      {
        body: {
          post_id: post.id,
        } satisfies IEconPoliticalForumBookmark.ICreate,
      },
    );
  typia.assert(bookmark);

  // 8) Other user attempts to list owner's bookmarks -> expect an error
  await TestValidator.error(
    "other user cannot list owner's bookmarks",
    async () => {
      await api.functional.econPoliticalForum.registeredUser.users.bookmarks.index(
        otherConn,
        {
          userId: owner.id,
          body: {
            page: 1,
            limit: 10,
          } satisfies IEconPoliticalForumBookmark.IRequest,
        },
      );
    },
  );

  // 9) Owner lists their own bookmarks -> should succeed and include created bookmark
  const page: IPageIEconPoliticalForumBookmark.ISummary =
    await api.functional.econPoliticalForum.registeredUser.users.bookmarks.index(
      ownerConn,
      {
        userId: owner.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEconPoliticalForumBookmark.IRequest,
      },
    );
  typia.assert(page);

  TestValidator.predicate(
    "owner's bookmarks include created bookmark",
    page.data.some((b) => b.id === bookmark.id),
  );
}

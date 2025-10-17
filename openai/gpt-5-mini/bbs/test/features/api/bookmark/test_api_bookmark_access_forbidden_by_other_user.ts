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

export async function test_api_bookmark_access_forbidden_by_other_user(
  connection: api.IConnection,
) {
  // 1) Administrator: register and create a category
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
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
          name: RandomGenerator.paragraph({ sentences: 3 }),
          slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: null,
          is_moderated: false,
          requires_verification: false,
          order: 1,
        } satisfies IEconPoliticalForumCategory.ICreate,
      },
    );
  typia.assert(category);

  // 2) User A: register, create thread, post, and bookmark
  const userAPassword = "UserAPass1234";
  const userA: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: userAPassword,
        username: RandomGenerator.name(1),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(userA);

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: {
          category_id: category.id,
          title: RandomGenerator.paragraph({ sentences: 6 }),
          slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
          status: "open",
        } satisfies IEconPoliticalForumThread.ICreate,
      },
    );
  typia.assert(thread);

  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      connection,
      {
        body: {
          thread_id: thread.id,
          content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 12,
          }),
        } satisfies IEconPoliticalForumPost.ICreate,
      },
    );
  typia.assert(post);

  const bookmark: IEconPoliticalForumBookmark =
    await api.functional.econPoliticalForum.registeredUser.bookmarks.create(
      connection,
      {
        body: {
          post_id: post.id,
        } satisfies IEconPoliticalForumBookmark.ICreate,
      },
    );
  typia.assert(bookmark);

  // 3) User B: register (this will set connection auth to User B)
  const userBPassword = "UserBPass1234";
  const userB: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: userBPassword,
        username: RandomGenerator.name(1),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(userB);

  // 4) Execution: User B attempts to retrieve User A's bookmark -> expect error
  await TestValidator.error(
    "non-owner cannot access another user's bookmark",
    async () => {
      await api.functional.econPoliticalForum.registeredUser.users.bookmarks.at(
        connection,
        {
          userId: userA.id,
          bookmarkId: bookmark.id,
        },
      );
    },
  );

  // 5) Business assertions: ensure in-memory bookmark remains active and references the post
  TestValidator.predicate(
    "bookmark remains active (not soft-deleted)",
    bookmark.deleted_at === null || bookmark.deleted_at === undefined,
  );
  TestValidator.equals(
    "bookmark references created post",
    bookmark.post_id,
    post.id,
  );

  // Cleanup note: No delete endpoint was provided in the SDK materials. CI
  // environment should reset the test database between test runs to avoid
  // leaking test artifacts.
}

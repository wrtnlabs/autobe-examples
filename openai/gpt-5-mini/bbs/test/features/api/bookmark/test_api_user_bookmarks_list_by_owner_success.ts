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

export async function test_api_user_bookmarks_list_by_owner_success(
  connection: api.IConnection,
) {
  // 1) Prepare separate connections for admin and owner to avoid token overwrite
  const adminConn: api.IConnection = { ...connection, headers: {} };
  const ownerConn: api.IConnection = { ...connection, headers: {} };

  // 2) Administrator: register and obtain admin token (adminConn will be updated by SDK)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(adminConn, {
      body: {
        email: adminEmail,
        password: "Adm1n!Passw0rd",
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(2),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 3) With adminConn create a category for threads
  const categoryName = RandomGenerator.name(2);
  const categorySlug = RandomGenerator.alphaNumeric(8).toLowerCase();
  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      adminConn,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          description: null,
          code: null,
          is_moderated: false,
          requires_verification: false,
          order: 1,
        } satisfies IEconPoliticalForumCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4) Owner: register and obtain owner token (ownerConn will be updated by SDK)
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const owner: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(ownerConn, {
      body: {
        username: RandomGenerator.name(1),
        email: ownerEmail,
        password: "User!Passw0rd",
        display_name: RandomGenerator.name(2),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(owner);

  // 5) With ownerConn create a thread in the category
  const threadTitle = RandomGenerator.paragraph({ sentences: 6 });
  const threadSlug = threadTitle.split(" ").slice(0, 4).join("-").toLowerCase();
  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      ownerConn,
      {
        body: {
          category_id: category.id,
          title: threadTitle,
          slug: threadSlug,
        } satisfies IEconPoliticalForumThread.ICreate,
      },
    );
  typia.assert(thread);

  // 6) With ownerConn create two posts in the thread
  const postBody1 = RandomGenerator.content({ paragraphs: 1 });
  const post1: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      ownerConn,
      {
        body: {
          thread_id: thread.id,
          content: postBody1,
        } satisfies IEconPoliticalForumPost.ICreate,
      },
    );
  typia.assert(post1);

  const postBody2 = RandomGenerator.content({ paragraphs: 1 });
  const post2: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      ownerConn,
      {
        body: {
          thread_id: thread.id,
          content: postBody2,
        } satisfies IEconPoliticalForumPost.ICreate,
      },
    );
  typia.assert(post2);

  // 7) With ownerConn create bookmarks for both posts
  const bookmark1: IEconPoliticalForumBookmark =
    await api.functional.econPoliticalForum.registeredUser.bookmarks.create(
      ownerConn,
      {
        body: {
          post_id: post1.id,
        } satisfies IEconPoliticalForumBookmark.ICreate,
      },
    );
  typia.assert(bookmark1);

  const bookmark2: IEconPoliticalForumBookmark =
    await api.functional.econPoliticalForum.registeredUser.bookmarks.create(
      ownerConn,
      {
        body: {
          post_id: post2.id,
        } satisfies IEconPoliticalForumBookmark.ICreate,
      },
    );
  typia.assert(bookmark2);

  // 8) Exercise the target operation: list bookmarks for owner with default pagination (page=1)
  const pageRequest = {
    page: 1,
  } satisfies IEconPoliticalForumBookmark.IRequest;
  const page: IPageIEconPoliticalForumBookmark.ISummary =
    await api.functional.econPoliticalForum.registeredUser.users.bookmarks.index(
      ownerConn,
      {
        userId: owner.id,
        body: pageRequest,
      },
    );
  typia.assert(page);

  // 9) Validation checks
  TestValidator.equals("pagination current is 1", page.pagination.current, 1);
  TestValidator.predicate(
    "returned bookmarks include first created post",
    page.data.map((b) => b.post_id).includes(post1.id),
  );
  TestValidator.predicate(
    "returned bookmarks include second created post",
    page.data.map((b) => b.post_id).includes(post2.id),
  );

  // Ensure at least two bookmarks returned (ordering not guaranteed)
  TestValidator.predicate(
    "at least two bookmarks are returned",
    page.data.length >= 2,
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumLegalHold";
import type { IEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPost";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalForumLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumLegalHold";

export async function test_api_legal_hold_list_for_post_by_admin_empty(
  connection: api.IConnection,
) {
  // 1. Prepare isolated connections for admin and user to avoid token clobbering
  const adminConn: api.IConnection = { ...connection, headers: {} };
  const userConn: api.IConnection = { ...connection, headers: {} };

  // 2. Admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = `admin_${RandomGenerator.alphaNumeric(6)}`;
  const adminAuth: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(adminConn, {
      body: {
        email: adminEmail,
        password: "Str0ngAdminPwd!",
        username: adminUsername,
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(adminAuth);
  TestValidator.predicate(
    "admin token present",
    typeof adminAuth.token.access === "string",
  );

  // 3. Registered user registration (author)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userName = `user_${RandomGenerator.alphaNumeric(6)}`;
  const userAuth: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(userConn, {
      body: {
        username: userName,
        email: userEmail,
        password: "UserPassw0rd!",
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(userAuth);
  TestValidator.predicate(
    "user token present",
    typeof userAuth.token.access === "string",
  );

  // 4. Admin creates a category
  const categoryBody = {
    code: null,
    name: `LegalHold Test Category ${RandomGenerator.alphaNumeric(4)}`,
    slug: `legal-hold-${RandomGenerator.alphaNumeric(6)}`,
    description: "Category for legal-hold listing tests",
    is_moderated: false,
    requires_verification: false,
    order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  } satisfies IEconPoliticalForumCategory.ICreate;

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      adminConn,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);
  TestValidator.equals(
    "created category name matches",
    category.name,
    categoryBody.name,
  );
  TestValidator.equals(
    "created category slug matches",
    category.slug,
    categoryBody.slug,
  );

  // 5. Registered user creates a thread in the created category
  const threadBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 5 }),
    slug: `t-${RandomGenerator.alphaNumeric(8)}`,
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      userConn,
      {
        body: threadBody,
      },
    );
  typia.assert(thread);
  TestValidator.equals(
    "thread category matches",
    thread.category_id,
    category.id,
  );

  // 6. Registered user creates a post in the thread
  const postBody = {
    thread_id: thread.id,
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 12,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IEconPoliticalForumPost.ICreate;

  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      userConn,
      {
        body: postBody,
      },
    );
  typia.assert(post);
  TestValidator.equals("post thread_id matches", post.thread_id, thread.id);

  // 7. Administrator lists legal holds for the created post
  const holdsPage: IPageIEconPoliticalForumLegalHold =
    await api.functional.econPoliticalForum.administrator.posts.legalHolds.index(
      adminConn,
      {
        postId: post.id,
      },
    );
  typia.assert(holdsPage);

  // Validate pagination object exists
  TestValidator.predicate(
    "pagination object exists",
    holdsPage.pagination !== null && typeof holdsPage.pagination === "object",
  );

  // Validate data array exists and is empty when no holds exist
  TestValidator.predicate(
    "legal holds items array exists",
    Array.isArray(holdsPage.data),
  );
  TestValidator.equals(
    "legal holds should be empty for new post",
    holdsPage.data.length,
    0,
  );

  // Note: Teardown / cleanup is environment-specific. The test runner should
  // reset the test DB between tests. If a cleanup endpoint exists it should be
  // invoked here. We avoid direct DB assertions or direct header mutation.
}

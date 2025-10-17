import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumLegalHold";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalForumLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumLegalHold";

export async function test_api_thread_legal_holds_listing_by_administrator(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * - Create an administrator and a registered user.
   * - Administrator creates a category.
   * - Registered user creates a thread in that category.
   * - Administrator lists legal holds for that thread and validates response
   *   shape.
   * - Validate that non-admin callers cannot access the listing (error expected).
   *
   * Notes:
   *
   * - No create-legal-hold API is available in the provided SDK. The test accepts
   *   environment-dependent seeding of legal holds and is resilient to an empty
   *   result set.
   */

  // 1) Create an admin context (separate connection so SDK sets auth header on it)
  const adminConn: api.IConnection = { ...connection, headers: {} };
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "A_strong_password_123!",
    username: RandomGenerator.name(1).toLowerCase(),
    display_name: RandomGenerator.name(2),
  } satisfies IEconPoliticalForumAdministrator.IJoin;

  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(adminConn, {
      body: adminBody,
    });
  typia.assert(admin);

  // 2) Admin creates a category
  const slug = RandomGenerator.paragraph({ sentences: 3 })
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  const categoryBody = {
    name: RandomGenerator.name(2),
    slug,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_moderated: false,
    requires_verification: false,
    order: 1,
  } satisfies IEconPoliticalForumCategory.ICreate;

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      adminConn,
      { body: categoryBody },
    );
  typia.assert(category);

  // 3) Create a registered user and thread (use a distinct connection for the user)
  const userConn: api.IConnection = { ...connection, headers: {} };
  const userBody = {
    username:
      RandomGenerator.name(1).toLowerCase() + RandomGenerator.alphaNumeric(3),
    email: typia.random<string & tags.Format<"email">>(),
    password: "UserPass_12345!",
    display_name: RandomGenerator.name(2),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const userAuth: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(userConn, {
      body: userBody,
    });
  typia.assert(userAuth);

  // 4) Registered user creates a thread in the category
  const threadSlug = RandomGenerator.paragraph({ sentences: 2 })
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  const threadBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 6 }),
    slug: threadSlug,
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      userConn,
      {
        body: threadBody,
      },
    );
  typia.assert(thread);

  // 5) Administrator lists legal holds for the created thread
  const page: IPageIEconPoliticalForumLegalHold =
    await api.functional.econPoliticalForum.administrator.threads.legalHolds.index(
      adminConn,
      { threadId: thread.id },
    );
  // Strong type validation of the page result
  typia.assert(page);

  // Business validations on pagination metadata
  TestValidator.predicate(
    "pagination metadata must have non-negative numbers",
    page.pagination.current >= 0 &&
      page.pagination.limit >= 0 &&
      page.pagination.pages >= 0 &&
      page.pagination.records >= 0,
  );

  // Validate each returned legal-hold item shape (if any)
  for (const hold of page.data) {
    typia.assert(hold as IEconPoliticalForumLegalHold);
  }

  // At least one of the following must be true:
  //  - The list contains a hold referencing the created thread
  //  - OR the list is empty (no holds seeded for the thread in this env)
  const hasHoldForThread = page.data.some((h) => h.thread_id === thread.id);
  TestValidator.predicate(
    "returned holds either reference the created thread or the list is empty",
    hasHoldForThread || page.data.length === 0,
  );

  // 6) Non-admin callers must not be able to list legal holds.
  // Use a fresh connection without admin credentials.
  const nonAdminConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("non-admin cannot list legal holds", async () => {
    await api.functional.econPoliticalForum.administrator.threads.legalHolds.index(
      nonAdminConn,
      { threadId: thread.id },
    );
  });

  // Additional notes:
  // - Creating legal-hold rows is environment-specific (no SDK create endpoint
  //   provided). This test intentionally avoids attempting to create holds via
  //   non-existent APIs and tolerates both seeded holds and empty results.
}

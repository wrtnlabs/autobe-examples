import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumThread";

export async function test_api_thread_public_listing_shows_created_thread(
  connection: api.IConnection,
) {
  // 1. Administrator registers
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Password12345"; // satisfies MinLength<10>
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(8),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 2. Create category as administrator
  const categoryBody = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
    description: null,
    is_moderated: false,
    requires_verification: false,
    order: 1,
  } satisfies IEconPoliticalForumCategory.ICreate;

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);
  TestValidator.equals(
    "created category name matches request",
    category.name,
    categoryBody.name,
  );
  TestValidator.equals(
    "created category slug matches request",
    category.slug,
    categoryBody.slug,
  );

  // 3. Registered user joins (becomes the thread author)
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword = "Password12345";
  const user: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(8),
        email: userEmail,
        password: userPassword,
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(user);

  // 4. Create a thread as the registered user
  const threadTitle = RandomGenerator.paragraph({ sentences: 8 });
  const threadSlug = `${RandomGenerator.alphaNumeric(6)}-${RandomGenerator.alphabets(4).toLowerCase()}`;
  const threadBody = {
    category_id: category.id,
    title: threadTitle,
    slug: threadSlug,
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: threadBody,
      },
    );
  typia.assert(thread);
  TestValidator.equals(
    "created thread category id matches",
    thread.category_id,
    category.id,
  );
  TestValidator.predicate(
    "created thread has id",
    typeof thread.id === "string" && thread.id.length > 0,
  );

  // 5. Public listing - search for threads (no explicit header manipulation)
  const pageRequest = {
    page: 1,
    limit: 20,
  } satisfies IEconPoliticalForumThread.IRequest;

  const page: IPageIEconPoliticalForumThread.ISummary =
    await api.functional.econPoliticalForum.threads.index(connection, {
      body: pageRequest,
    });
  typia.assert(page);

  // Validate pagination information if present
  if (page.pagination) {
    TestValidator.equals(
      "listing page current equals requested page",
      page.pagination.current,
      1,
    );
  }

  // Validate that the created thread appears in the returned summaries
  const found = ArrayUtil.has(page.data, (s) => s.id === thread.id);
  TestValidator.predicate("public listing includes created thread", found);
}

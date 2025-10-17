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

export async function test_api_thread_list_by_category_public(
  connection: api.IConnection,
) {
  // 1) Administrator signs up and becomes the active authenticated user on the connection
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "Admin!Pass2025",
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(2),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 2) Administrator creates a category to host threads
  const categoryName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const categorySlug = RandomGenerator.alphaNumeric(8).toLowerCase();
  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      {
        body: {
          code: null,
          name: categoryName,
          slug: categorySlug,
          description: null,
          is_moderated: false,
          requires_verification: false,
          order: 1,
        } satisfies IEconPoliticalForumCategory.ICreate,
      },
    );
  typia.assert(category);
  TestValidator.predicate("category has id", !!category.id);

  // 3) Registered user signs up and becomes active on the connection
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userName = RandomGenerator.alphaNumeric(8).toLowerCase();
  const registered: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: userName,
        email: userEmail,
        password: "User!Pass2025",
        display_name: RandomGenerator.name(2),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(registered);

  // 4) Registered user creates a thread in the newly created category
  const threadTitle = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 3,
    wordMax: 8,
  });
  const threadSlug = RandomGenerator.alphaNumeric(10).toLowerCase();

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: {
          category_id: category.id,
          title: threadTitle,
          slug: threadSlug,
        } satisfies IEconPoliticalForumThread.ICreate,
      },
    );
  typia.assert(thread);
  TestValidator.equals(
    "created thread category matches",
    thread.category_id,
    category.id,
  );

  // 5) Call the category-scoped listing endpoint (public listing behavior)
  const pageResult: IPageIEconPoliticalForumThread.ISummary =
    await api.functional.econPoliticalForum.categories.threads.index(
      connection,
      {
        categoryId: category.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IEconPoliticalForumThread.IRequest,
      },
    );
  typia.assert(pageResult);

  // 6) Basic pagination sanity checks
  TestValidator.equals(
    "pagination current page",
    pageResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", pageResult.pagination.limit, 20);
  TestValidator.predicate(
    "pagination pages is at least 1",
    pageResult.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination records at least 1",
    pageResult.pagination.records >= 1,
  );

  // 7) Ensure the created thread appears in the listing
  TestValidator.predicate(
    "created thread appears in category listing",
    pageResult.data.some((d) => d.id === thread.id),
  );

  // 8) Find the summary for our created thread and verify summary fields
  const found = pageResult.data.find((d) => d.id === thread.id);
  if (found) {
    TestValidator.equals("thread id matches", found.id, thread.id);
    TestValidator.equals("thread title matches", found.title, thread.title);
    TestValidator.equals(
      "thread category id matches",
      found.category_id,
      category.id,
    );
  }
}

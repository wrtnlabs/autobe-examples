import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";

export async function test_api_thread_public_retrieval_after_creation(
  connection: api.IConnection,
) {
  /**
   * End-to-end test:
   *
   * 1. Admin joins and creates a category.
   * 2. Registered user joins and creates a thread in that category.
   * 3. Public (unauthenticated) client retrieves the thread by id and validates
   *    key metadata.
   * 4. Negative check: retrieval of a non-existent thread id must error.
   */

  // 1) Administrator: join and create category
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "P@ssw0rd_admin_123",
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(1),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // Create a category as administrator
  const categoryName = `e2e-category-${RandomGenerator.alphaNumeric(6)}`;
  const categorySlug = categoryName.toLowerCase().replace(/[^a-z0-9-]/g, "-");
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

  // 2) Registered user: join
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const registered: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: userEmail,
        password: "P@ssw0rd_user_123",
        display_name: RandomGenerator.name(1),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(registered);

  // 3) Create thread as registered user
  const threadTitle = "E2E Test Thread - Public Retrieval";
  const threadSlug =
    `e2e-thread-${RandomGenerator.alphaNumeric(6)}`.toLowerCase();
  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: {
          category_id: category.id,
          title: threadTitle,
          slug: threadSlug,
          status: "open",
          pinned: false,
        } satisfies IEconPoliticalForumThread.ICreate,
      },
    );
  typia.assert(thread);

  // 4) Public retrieval: unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  const read: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.threads.at(unauthConn, {
      threadId: thread.id,
    });
  typia.assert(read);

  // Business assertions
  TestValidator.equals(
    "retrieved thread id matches created thread",
    read.id,
    thread.id,
  );
  TestValidator.equals(
    "retrieved thread category matches created category",
    read.category_id,
    category.id,
  );
  TestValidator.equals(
    "retrieved thread title matches created title",
    read.title,
    threadTitle,
  );
  TestValidator.predicate(
    "retrieved thread has author id",
    typeof read.author_id === "string" && read.author_id.length > 0,
  );
  TestValidator.predicate(
    "thread is not soft-deleted (deleted_at is null or undefined)",
    read.deleted_at === null || read.deleted_at === undefined,
  );

  // 5) Negative check: non-existent thread retrieval should error
  await TestValidator.error(
    "non-existent thread retrieval should fail",
    async () => {
      await api.functional.econPoliticalForum.threads.at(unauthConn, {
        threadId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // NOTE: Teardown/cleanup (soft-delete) endpoints are not available in the
  // provided SDK list; rely on test DB isolation or external cleanup.
}

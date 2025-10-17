import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";

export async function test_api_thread_update_by_author(
  connection: api.IConnection,
) {
  // 1) Administrator signs up (token auto-attached to connection)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = `${RandomGenerator.alphaNumeric(12)}!`;
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: `admin_${RandomGenerator.alphaNumeric(6)}`,
        display_name: `Admin ${RandomGenerator.name()}`,
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 2) Create category as administrator
  const categoryRequest = {
    name: `Category ${RandomGenerator.name()}`,
    slug: `${RandomGenerator.alphaNumeric(6)}-${RandomGenerator.alphaNumeric(2)}`.toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_moderated: false,
    requires_verification: false,
    // Use a reasonable small order to avoid unrealistic values
    order:
      (typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
      >() as number) || 1,
  } satisfies IEconPoliticalForumCategory.ICreate;

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      {
        body: categoryRequest,
      },
    );
  typia.assert(category);

  // 3) Registered user (author) signs up - this replaces the connection token
  const authorEmail: string = typia.random<string & tags.Format<"email">>();
  const authorPassword = `${RandomGenerator.alphaNumeric(12)}#`;
  const author: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `user_${RandomGenerator.alphaNumeric(6)}`,
        email: authorEmail,
        password: authorPassword,
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(author);

  // 4) Create thread as the author
  const createThreadBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 3, wordMax: 10 }),
    slug: `${RandomGenerator.alphaNumeric(6)}-${RandomGenerator.alphaNumeric(3)}`.toLowerCase(),
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: createThreadBody,
      },
    );
  typia.assert(thread);

  TestValidator.equals(
    "created thread author matches",
    thread.author_id,
    author.id,
  );
  TestValidator.equals(
    "created thread category matches",
    thread.category_id,
    category.id,
  );

  // 5) Update thread as the same author (title and slug)
  const newTitle = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 10,
  });
  const newSlug =
    `${RandomGenerator.alphaNumeric(6)}-${RandomGenerator.alphaNumeric(4)}`.toLowerCase();

  const updateBody = {
    title: newTitle,
    slug: newSlug,
  } satisfies IEconPoliticalForumThread.IUpdate;

  const updated: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.update(
      connection,
      {
        threadId: thread.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // Business assertions
  TestValidator.equals("updated title applied", updated.title, newTitle);
  TestValidator.equals("updated slug applied", updated.slug, newSlug);
  TestValidator.equals(
    "author unchanged after update",
    updated.author_id,
    thread.author_id,
  );
  TestValidator.equals(
    "category unchanged after update",
    updated.category_id,
    thread.category_id,
  );
  TestValidator.predicate(
    "updated_at is later than created_at",
    Date.parse(updated.updated_at) > Date.parse(updated.created_at),
  );

  // Teardown note: cleanup should be handled by the test harness (DB rollback or test DB reset).
}

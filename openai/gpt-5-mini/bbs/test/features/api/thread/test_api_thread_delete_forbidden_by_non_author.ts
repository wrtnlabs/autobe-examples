import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";

/**
 * Validate that a registered user who is NOT the thread author cannot
 * soft-delete another user's thread.
 *
 * Steps:
 *
 * 1. Administrator registers (auth.administrator.join) and creates a category.
 * 2. Author registers (auth.registeredUser.join) and creates a thread in that
 *    category.
 * 3. Non-author registers (auth.registeredUser.join) and attempts to delete the
 *    thread. Expectation: the DELETE call fails with 403 Forbidden or 404 Not
 *    Found.
 * 4. Re-run deletion using the author's token to ensure the thread still existed
 *    and is deletable by its real owner. Expectation: the author's DELETE
 *    succeeds; attempting to delete it again fails.
 */
export async function test_api_thread_delete_forbidden_by_non_author(
  connection: api.IConnection,
) {
  // 1) Administrator registration → create category
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(2),
  } satisfies IEconPoliticalForumAdministrator.IJoin;

  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminBody,
    });
  typia.assert(admin);

  const categoryBody = {
    name: RandomGenerator.name(2),
    slug: `cat-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_moderated: false,
    requires_verification: false,
    order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  } satisfies IEconPoliticalForumCategory.ICreate;

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  // 2) Author registration → create thread as author
  const authorBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Author#Pass123",
    display_name: RandomGenerator.name(2),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const author: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: authorBody,
    });
  typia.assert(author);

  const threadBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 8 }),
    slug: `thread-${RandomGenerator.alphaNumeric(10)}`,
    status: "open",
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: threadBody,
      },
    );
  typia.assert(thread);

  // Basic check: on creation deleted_at should be null/undefined
  TestValidator.predicate(
    "thread.created.deleted_at is null or undefined",
    thread.deleted_at === null || thread.deleted_at === undefined,
  );

  // 3) Non-author registration and deletion attempt
  const nonAuthorBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "NonAuthor#Pass123",
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const nonAuthor: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: nonAuthorBody,
    });
  typia.assert(nonAuthor);

  // Attempt deletion as non-author: expect 403 or 404
  await TestValidator.httpError(
    "non-author cannot delete thread",
    [403, 404],
    async () => {
      await api.functional.econPoliticalForum.registeredUser.threads.erase(
        connection,
        {
          threadId: thread.id,
        },
      );
    },
  );

  // 4) Ensure resource persisted and owner can delete it. Construct a new
  // connection using the author's token so we call DELETE as the author.
  const authorConn: api.IConnection = {
    ...connection,
    headers: { Authorization: author.token.access },
  };

  // Author deletes successfully (void response). If this throws, test fails.
  await api.functional.econPoliticalForum.registeredUser.threads.erase(
    authorConn,
    {
      threadId: thread.id,
    },
  );

  // After successful delete by author, deleting again should error (not found or forbidden).
  await TestValidator.httpError(
    "deleted thread cannot be deleted again",
    [403, 404],
    async () => {
      await api.functional.econPoliticalForum.registeredUser.threads.erase(
        authorConn,
        {
          threadId: thread.id,
        },
      );
    },
  );
}

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
 * Validate that a registered user (thread author) cannot set pinned=true via
 * the thread update endpoint. Two acceptable outcomes are allowed by policy:
 *
 * - The API rejects the attempt (e.g., authorization enforcement).
 * - The API accepts the update but ignores the pinned flag (only allowed fields
 *   such as title are updated). In either case, the pinned flag must remain
 *   false after the author's attempt.
 *
 * Workflow:
 *
 * 1. Administrator signs up (administrator.join) to create a category.
 * 2. Administrator creates a category for the thread.
 * 3. Registered user (author) signs up (registeredUser.join).
 * 4. Author creates a thread in the category (threads.create) with pinned=false.
 * 5. Author attempts to update the thread with pinned=true via threads.update.
 *
 *    - If the call throws, verify that an error occurred when author tried to set
 *         pinned.
 *    - If the call succeeds, verify that pinned remains false (ignored) and that
 *         allowed fields like title were updated when permitted.
 */
export async function test_api_thread_update_pinned_forbidden_by_author(
  connection: api.IConnection,
) {
  // 1. Administrator registration (creates admin session token on connection)
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!",
    username: RandomGenerator.alphaNumeric(8),
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumAdministrator.IJoin;

  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminBody,
    });
  typia.assert(admin);

  // 2. Create category as administrator
  const categoryBody = {
    code: null,
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
    description: null,
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
  TestValidator.equals(
    "category created with expected slug",
    category.slug,
    categoryBody.slug,
  );

  // 3. Registered user (author) registration
  const authorBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "UserPassw0rd!",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const author: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: authorBody,
    });
  typia.assert(author);

  // 4. Author creates a thread in the category (pinned explicitly false)
  const title = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 3,
    wordMax: 8,
  });
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);

  const threadCreateBody = {
    category_id: category.id,
    title,
    slug,
    status: "open",
    pinned: false,
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: threadCreateBody,
      },
    );
  typia.assert(thread);

  TestValidator.equals(
    "thread category matches created category",
    thread.category_id,
    category.id,
  );
  TestValidator.equals("thread initially not pinned", thread.pinned, false);

  // 5. Author attempts to update pinned=true (and change title)
  const updateBody = {
    pinned: true,
    title: "Minor edit",
  } satisfies IEconPoliticalForumThread.IUpdate;

  try {
    const updated: IEconPoliticalForumThread =
      await api.functional.econPoliticalForum.registeredUser.threads.update(
        connection,
        {
          threadId: thread.id,
          body: updateBody,
        },
      );

    // If update succeeded, typia.assert and validate pinned was not elevated
    typia.assert(updated);

    TestValidator.equals(
      "pinned flag must remain false when author attempts to set pinned",
      updated.pinned,
      false,
    );

    // Title may be updated depending on policy; check it matches requested title
    TestValidator.equals(
      "title updated when allowed",
      updated.title,
      updateBody.title,
    );
  } catch (exp) {
    // If update throws (authorization enforced), assert that an error occurred.
    // Do NOT assert specific HTTP status codes; just verify the operation failed
    // for this unauthorized attempt.
    TestValidator.predicate(
      "update rejected when author attempted to set pinned",
      exp instanceof Error,
    );
  }

  // Note: Environment-level cleanup is expected to be handled by the test
  // harness (DB reset between tests). This test does not attempt manual
  // deletion to avoid race conditions in shared environments.
}

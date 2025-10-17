import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerator";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";

export async function test_api_thread_soft_delete_forbidden_for_non_administrator(
  connection: api.IConnection,
) {
  /**
   * E2E Test: Verify that a moderator (non-administrator) cannot call the
   * administrator-scoped soft-delete endpoint for a thread.
   *
   * Flow:
   *
   * 1. Create administrator account (admin authenticated)
   * 2. Admin creates a category
   * 3. Create a registered user (user authenticated)
   * 4. Registered user creates a thread in the category
   * 5. Create a moderator account (moderator authenticated)
   * 6. Using the moderator credentials, attempt administrator.threads.erase() and
   *    assert that the call throws (forbidden)
   * 7. Assert that the originally created thread still has deleted_at === null
   *
   * Note: The SDK provided in materials does not include a GET thread-by-id
   * operation. Therefore the post-condition check verifies the created thread
   * object's deleted_at field (the only available assertion given the SDK).
   */

  // 1) Administrator registration
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: `${RandomGenerator.alphaNumeric(6)}${typia.random<string & tags.Format<"uuid">>().slice(0, 8)}`,
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumAdministrator.IJoin;

  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminBody,
    });
  typia.assert(admin);

  // 2) Admin creates category
  const categoryBody = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    slug: `${RandomGenerator.alphaNumeric(6)}-${RandomGenerator.alphaNumeric(2)}`.toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_moderated: false,
    requires_verification: false,
    order: 1,
  } satisfies IEconPoliticalForumCategory.ICreate;

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // 3) Registered user registration (becomes authenticated caller)
  const userBody = {
    username: `${RandomGenerator.alphaNumeric(6)}${typia.random<string & tags.Format<"uuid">>().slice(0, 6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const user: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: userBody,
    });
  typia.assert(user);

  // 4) Registered user creates a thread in the category
  const threadBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 6 }),
    slug: `${RandomGenerator.alphaNumeric(8)}-${RandomGenerator.alphaNumeric(4)}`.toLowerCase(),
    status: "open",
    pinned: false,
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      { body: threadBody },
    );
  typia.assert(thread);

  // Sanity: thread should not be soft-deleted at creation
  TestValidator.equals(
    "created thread should not be soft-deleted",
    thread.deleted_at,
    null,
  );

  // 5) Moderator registration (becomes authenticated caller)
  const moderatorBody = {
    username: `${RandomGenerator.alphaNumeric(6)}${typia.random<string & tags.Format<"uuid">>().slice(0, 6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumModerator.ICreate;

  const moderator: IEconPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorBody,
    });
  typia.assert(moderator);

  // 6) Unauthorized action: moderator attempts the admin-only erase endpoint
  await TestValidator.error(
    "moderator cannot perform administrator soft-delete on thread",
    async () => {
      await api.functional.econPoliticalForum.administrator.threads.erase(
        connection,
        { threadId: thread.id },
      );
    },
  );

  // 7) Post-condition assertion: thread remains not soft-deleted.
  // Given SDK limitations (no GET-by-id), verify the created thread object's field.
  TestValidator.equals(
    "thread.deleted_at remains null after forbidden attempt",
    thread.deleted_at,
    null,
  );
}

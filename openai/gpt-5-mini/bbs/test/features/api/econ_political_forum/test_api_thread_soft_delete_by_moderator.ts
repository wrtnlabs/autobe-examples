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

export async function test_api_thread_soft_delete_by_moderator(
  connection: api.IConnection,
) {
  /**
   * End-to-end test: Moderator soft-deletes a thread.
   *
   * Steps implemented:
   *
   * 1. Administrator registration (join) — used to create a category.
   * 2. Create category as administrator.
   * 3. Registered user registration (join) — used to create a thread.
   * 4. Registered user creates a thread in the created category.
   * 5. Moderator registration (join) — obtain moderator credentials.
   * 6. Moderator calls erase to soft-delete the thread.
   * 7. Attempt to erase the same thread again and assert an error is thrown
   *    (approximates server-side non-availability/404 after deletion).
   *
   * Notes on limitations:
   *
   * - The provided SDK does not include a GET thread endpoint or moderation log
   *   read endpoints; therefore direct verification of deleted_at, moderation
   *   log rows, and notifications is not possible via the SDK.
   * - This test therefore validates the behavior available through the provided
   *   SDK: creation flows succeed, erase completes, and a repeated erase fails
   *   (error thrown).
   */

  // 1) Administrator signup
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123",
      username: ("admin_" + RandomGenerator.alphaNumeric(6)).toLowerCase(),
      display_name: RandomGenerator.name(2),
    } satisfies IEconPoliticalForumAdministrator.IJoin,
  });
  typia.assert(admin);

  // 2) Create category as admin
  const categoryBody = {
    name: "test-category-" + RandomGenerator.alphaNumeric(6),
    slug: ("cat-" + RandomGenerator.alphaNumeric(6)).toLowerCase(),
    description: "Category created by E2E test",
    is_moderated: false,
    requires_verification: false,
    order: 1,
  } satisfies IEconPoliticalForumCategory.ICreate;

  const category =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // 3) Registered user signup (thread author)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.registeredUser.join(connection, {
    body: {
      username: ("user_" + RandomGenerator.alphaNumeric(6)).toLowerCase(),
      email: userEmail,
      password: "UserPassword123",
      display_name: RandomGenerator.name(2),
    } satisfies IEconPoliticalForumRegisteredUser.IJoin,
  });
  typia.assert(user);

  // 4) Registered user creates a thread
  const threadBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 4, wordMax: 8 }),
    slug: ("t-" + RandomGenerator.alphaNumeric(8)).toLowerCase(),
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      { body: threadBody },
    );
  typia.assert(thread);

  // 5) Moderator signup
  const modEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: ("mod_" + RandomGenerator.alphaNumeric(6)).toLowerCase(),
      email: modEmail,
      password: "ModeratorPass123",
      display_name: RandomGenerator.name(2),
    } satisfies IEconPoliticalForumModerator.ICreate,
  });
  typia.assert(moderator);

  // 6) Moderator erases (soft-delete) the thread
  await api.functional.econPoliticalForum.moderator.threads.erase(connection, {
    threadId: thread.id,
  });

  // 7) Attempt to erase again — expect an error (e.g., not found) and assert that an error is thrown
  await TestValidator.error(
    "deleted thread cannot be erased twice",
    async () => {
      await api.functional.econPoliticalForum.moderator.threads.erase(
        connection,
        {
          threadId: thread.id,
        },
      );
    },
  );

  // Final sanity checks (type-safety assertions already performed). If the
  // environment supports DB-level checks, they should be implemented outside
  // this SDK-only test to verify deleted_at, moderation logs, and notifications.
}

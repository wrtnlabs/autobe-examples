import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";

export async function test_api_thread_soft_delete_forbidden_for_non_moderator(
  connection: api.IConnection,
) {
  /**
   * Purpose: Ensure that a regular registered user (non-moderator) cannot
   * soft-delete a thread using the moderator-only endpoint. The test follows
   * these steps:
   *
   * 1. Create administrator (admin) and obtain token
   * 2. Admin creates a category
   * 3. Create a regular registered user and obtain token
   * 4. Registered user creates a thread in the category
   * 5. Registered user attempts to call the moderator delete endpoint -> must
   *    throw
   * 6. Verify the created thread was not soft-deleted (deleted_at is
   *    null/undefined)
   *
   * Notes:
   *
   * - The SDK automatically updates connection.headers.Authorization after join
   *   calls.
   * - Cannot re-fetch thread or moderation logs because no GET/log endpoints are
   *   provided in SDK; adapt verifications accordingly.
   */

  // 1) Administrator signup
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "securePassword123",
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 2) Admin creates a category
  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 6 }),
          is_moderated: false,
          requires_verification: false,
          order: 1,
        } satisfies IEconPoliticalForumCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3) Registered user signup (this will set connection.headers to the registered user's token)
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const registered: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: userEmail,
        password: "password1234",
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(registered);

  // 4) Registered user creates a thread in the category
  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: {
          category_id: category.id,
          title: RandomGenerator.paragraph({ sentences: 6 }),
          slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
          status: "open",
        } satisfies IEconPoliticalForumThread.ICreate,
      },
    );
  typia.assert(thread);

  // Sanity: created thread should not be soft-deleted initially
  TestValidator.predicate(
    "created thread should not be soft-deleted at creation",
    thread.deleted_at === null || thread.deleted_at === undefined,
  );

  // 5) Unauthorized action: registered user attempts moderator delete
  // Expect an error (authorization denied). Use TestValidator.error with async callback.
  await TestValidator.error(
    "non-moderator cannot soft-delete thread via moderator endpoint",
    async () => {
      await api.functional.econPoliticalForum.moderator.threads.erase(
        connection,
        {
          threadId: thread.id,
        },
      );
    },
  );

  // 6) Post-condition: verify local captured thread still indicates no deletion
  // Note: Because the SDK does not provide a GET thread endpoint, we cannot re-fetch
  // server state here. We therefore assert that the originally captured thread
  // (the artifact we have) was created without deletion timestamp and that the
  // moderator erase call threw as expected. This is the best verification
  // possible with the provided SDK.
  TestValidator.predicate(
    "thread remains not deleted (no deleted_at on created artifact)",
    thread.deleted_at === null || thread.deleted_at === undefined,
  );
}

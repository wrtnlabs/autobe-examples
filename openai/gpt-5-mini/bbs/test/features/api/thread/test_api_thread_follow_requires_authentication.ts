import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";
import type { IEconPoliticalForumThreadFollow } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThreadFollow";

/**
 * Validate that following a thread requires authentication.
 *
 * Steps:
 *
 * 1. Administrator joins and creates a category.
 * 2. Registered user joins and creates a thread within that category.
 * 3. An unauthenticated client attempts to POST /threads/{threadId}/follows and
 *    must be rejected (401).
 * 4. The authenticated registered user then creates the follow successfully and
 *    the returned follow record is validated.
 */
export async function test_api_thread_follow_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Administrator signs up
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 2. Administrator creates a category
  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      {
        body: {
          name: `Category ${RandomGenerator.name(2)}`,
          slug: `cat-${RandomGenerator.alphaNumeric(6)}`,
          code: null,
          description: "Automated test category",
          is_moderated: false,
          requires_verification: false,
          order: 1,
        } satisfies IEconPoliticalForumCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Registered user joins
  const userEmail = typia.random<string & tags.Format<"email">>();
  const registered: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `user_${RandomGenerator.alphaNumeric(8)}`,
        email: userEmail,
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(registered);

  // 4. Registered user creates a thread under the category
  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: {
          category_id: category.id,
          title: RandomGenerator.paragraph({
            sentences: 6,
            wordMin: 3,
            wordMax: 8,
          }),
          slug: `thread-${RandomGenerator.alphaNumeric(8)}`,
          status: "open",
          pinned: false,
        } satisfies IEconPoliticalForumThread.ICreate,
      },
    );
  typia.assert(thread);

  // 5. Attempt to follow the thread WITHOUT authentication
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.httpError(
    "unauthenticated follow should be rejected",
    401,
    async () => {
      await api.functional.econPoliticalForum.registeredUser.threads.follows.create(
        unauthConn,
        {
          threadId: thread.id,
          body: {
            thread_id: thread.id,
            muted_until: null,
          } satisfies IEconPoliticalForumThreadFollow.ICreate,
        },
      );
    },
  );

  // 6. Authenticated registered user creates the follow successfully
  const follow: IEconPoliticalForumThreadFollow =
    await api.functional.econPoliticalForum.registeredUser.threads.follows.create(
      connection,
      {
        threadId: thread.id,
        body: {
          thread_id: thread.id,
          muted_until: null,
        } satisfies IEconPoliticalForumThreadFollow.ICreate,
      },
    );
  typia.assert(follow);

  // Validate follow properties
  TestValidator.equals(
    "follow.thread_id matches created thread id",
    follow.thread_id,
    thread.id,
  );
  TestValidator.equals(
    "follow.registereduser_id matches created user id",
    follow.registereduser_id,
    registered.id,
  );
}

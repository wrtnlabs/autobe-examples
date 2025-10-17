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
 * Validate idempotent follow creation for a thread.
 *
 * Business purpose: Ensure that repeated identical follow creation requests by
 * the same authenticated registered user do not create duplicate follow records
 * and always return the canonical follow resource. This protects against
 * duplicate subscription side-effects and enforces uniqueness on
 * (registereduser_id, thread_id).
 *
 * Test flow:
 *
 * 1. Administrator registers and creates a category.
 * 2. Registered user registers (caller A).
 * 3. Registered user creates a thread in the category.
 * 4. Caller A posts a follow request for the thread (first call).
 * 5. Caller A repeats the identical follow request (second call).
 * 6. Assert that both responses reference the same follow id and that follow links
 *    to the expected user and thread.
 */
export async function test_api_thread_follow_idempotent_creation(
  connection: api.IConnection,
) {
  // 1. Administrator signs up and becomes authenticated (SDK sets Authorization)
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.alphabets(8),
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumAdministrator.IJoin;

  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminInput,
    });
  typia.assert(admin);

  // 2. Administrator creates a category
  const categoryCreate = {
    code: null,
    name: `test-category-${RandomGenerator.alphabets(6)}`,
    slug: RandomGenerator.alphabets(6),
    description: "E2E test category",
    is_moderated: false,
    requires_verification: false,
    order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  } satisfies IEconPoliticalForumCategory.ICreate;

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      {
        body: categoryCreate,
      },
    );
  typia.assert(category);

  // 3. Registered user (caller A) signs up — SDK will set Authorization to this user
  const userInput = {
    username: `user_${RandomGenerator.alphabets(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const user: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: userInput,
    });
  typia.assert(user);

  // 4. Registered user creates a thread in the category
  const threadCreate = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 6 }),
    slug: `t-${RandomGenerator.alphabets(8)}`,
    status: "open",
    pinned: false,
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: threadCreate,
      },
    );
  typia.assert(thread);
  TestValidator.equals(
    "created thread belongs to category",
    thread.category_id,
    category.id,
  );

  // 5. Caller A follows the thread (first request)
  const followReq = {
    thread_id: thread.id,
    muted_until: null,
  } satisfies IEconPoliticalForumThreadFollow.ICreate;

  const follow1: IEconPoliticalForumThreadFollow =
    await api.functional.econPoliticalForum.registeredUser.threads.follows.create(
      connection,
      {
        threadId: thread.id,
        body: followReq,
      },
    );
  typia.assert(follow1);

  // Basic sanity checks
  TestValidator.equals(
    "first follow references thread",
    follow1.thread_id,
    thread.id,
  );
  TestValidator.equals(
    "first follow references user",
    follow1.registereduser_id,
    user.id,
  );

  // 6. Caller A repeats identical follow request (second request)
  const follow2: IEconPoliticalForumThreadFollow =
    await api.functional.econPoliticalForum.registeredUser.threads.follows.create(
      connection,
      {
        threadId: thread.id,
        body: followReq,
      },
    );
  typia.assert(follow2);

  // 7. Idempotency assertions
  TestValidator.equals(
    "follow should be idempotent: same id returned",
    follow2.id,
    follow1.id,
  );
  TestValidator.equals(
    "follow still references same thread",
    follow2.thread_id,
    thread.id,
  );
  TestValidator.equals(
    "follow still references same user",
    follow2.registereduser_id,
    user.id,
  );

  // 8. No duplicate side-effects check (best-effort): assert created_at exists
  // typia.assert already validates created_at format. Use predicate as extra
  TestValidator.predicate(
    "follow created_at exists and is ISO string",
    typeof follow1.created_at === "string" && follow1.created_at.length > 0,
  );
}

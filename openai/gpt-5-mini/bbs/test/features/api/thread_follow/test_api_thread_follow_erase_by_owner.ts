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

export async function test_api_thread_follow_erase_by_owner(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * - Ensure a registered user (the owner) can soft-delete (erase) their follow
   *   on a thread
   * - Ensure the erase operation is idempotent (repeated DELETE returns
   *   success/no error)
   * - Validate soft-delete/reactivation semantics by re-creating the follow after
   *   erase
   *
   * Workflow:
   *
   * 1. Administrator sign-up (creates admin token on connection)
   * 2. Admin creates a category used by the thread
   * 3. Registered user sign-up (user token set on connection)
   * 4. Registered user creates a thread in the category
   * 5. Registered user creates a follow for that thread
   * 6. Registered user erases the follow (await erase)
   * 7. Repeat erase to validate idempotency
   * 8. Re-create the follow and validate ownership, association, and deleted_at
   *    cleared
   */

  // 1) Administrator sign up
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    // Ensure password length >= 12 for safety
    password: `Adm!n_${RandomGenerator.alphaNumeric(10)}`,
    username: RandomGenerator.alphaNumeric(8),
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumAdministrator.IJoin;

  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminBody,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "admin id present",
    typeof admin.id === "string" && admin.id.length > 0,
  );

  // 2) Admin creates category
  const categoryBody = {
    name: RandomGenerator.name(2),
    slug: `${RandomGenerator.alphabets(6)}-${Date.now()}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_moderated: false,
    requires_verification: false,
    // deterministic small integer for reproducibility
    order: 1,
  } satisfies IEconPoliticalForumCategory.ICreate;

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);
  TestValidator.predicate(
    "category id is present",
    typeof category.id === "string" && category.id.length > 0,
  );

  // 3) Registered user sign up (their token will be set on connection)
  const userBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    // ensure password at least 12 characters
    password: `Usr!_${RandomGenerator.alphaNumeric(10)}`,
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const user: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: userBody,
    });
  typia.assert(user);
  TestValidator.predicate(
    "registered user id present",
    typeof user.id === "string" && user.id.length > 0,
  );

  // 4) Registered user creates a thread in the created category
  const threadBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 6 }),
    slug: `thr-${RandomGenerator.alphaNumeric(6)}-${Date.now()}`,
    status: "open",
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      { body: threadBody },
    );
  typia.assert(thread);
  TestValidator.equals(
    "created thread belongs to category",
    thread.category_id,
    category.id,
  );

  // 5) Registered user creates a follow for the thread
  const followCreateBody = {
    thread_id: thread.id,
  } satisfies IEconPoliticalForumThreadFollow.ICreate;

  const follow: IEconPoliticalForumThreadFollow =
    await api.functional.econPoliticalForum.registeredUser.threads.follows.create(
      connection,
      {
        threadId: thread.id,
        body: followCreateBody,
      },
    );
  typia.assert(follow);
  TestValidator.equals(
    "follow is associated with thread",
    follow.thread_id,
    thread.id,
  );
  TestValidator.equals(
    "follow owned by registered user",
    follow.registereduser_id,
    user.id,
  );
  TestValidator.predicate(
    "initial follow should be active",
    follow.deleted_at === null || follow.deleted_at === undefined,
  );

  // 6) Owner erases (soft-delete) the follow
  await api.functional.econPoliticalForum.registeredUser.threads.follows.erase(
    connection,
    {
      threadId: thread.id,
      followId: follow.id,
    },
  );

  // 7) Idempotency: repeat erase should not throw (still returns successfully)
  await api.functional.econPoliticalForum.registeredUser.threads.follows.erase(
    connection,
    {
      threadId: thread.id,
      followId: follow.id,
    },
  );

  // 8) Re-create the follow; server may return existing/reactivated follow or a new one.
  const followAfter: IEconPoliticalForumThreadFollow =
    await api.functional.econPoliticalForum.registeredUser.threads.follows.create(
      connection,
      {
        threadId: thread.id,
        body: followCreateBody,
      },
    );
  typia.assert(followAfter);

  // Ownership and association checks
  TestValidator.equals(
    "follow owner is the registered user",
    followAfter.registereduser_id,
    user.id,
  );
  TestValidator.equals(
    "follow associated to same thread",
    followAfter.thread_id,
    thread.id,
  );

  // Ensure the returned follow is active (deleted_at must be null/undefined)
  TestValidator.predicate(
    "follow deleted_at should be null or undefined after re-creation",
    followAfter.deleted_at === null || followAfter.deleted_at === undefined,
  );

  // If the server reactivated the same follow record, updated_at should have changed
  if (followAfter.id === follow.id) {
    TestValidator.predicate(
      "reactivated follow updated_at changed",
      followAfter.updated_at !== follow.updated_at,
    );
  }
}

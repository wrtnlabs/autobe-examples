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

export async function test_api_user_follows_upsert_and_unfollow(
  connection: api.IConnection,
) {
  /**
   * Validate follow creation and idempotent/upsert semantics with available
   * SDK.
   *
   * Purpose:
   *
   * - Ensure a registered user can follow a thread via the POST create endpoint.
   * - Ensure duplicate create requests are idempotent and do not produce
   *   duplicate follow records.
   *
   * Note: The SDK does not provide PATCH/DELETE endpoints for unfollow
   * (soft-delete) or a follow-list that exposes deleted entries. Therefore
   * soft-delete and reactivation behaviors are not tested here. If such
   * endpoints are added, extend this test to cover deleted_at toggling and
   * reactivation.
   */

  // 1) Administrator registration
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 2) Admin creates a category
  const categoryBody = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    slug: RandomGenerator.alphaNumeric(10).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_moderated: false,
    requires_verification: false,
    order: 1,
  } satisfies IEconPoliticalForumCategory.ICreate;

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);
  TestValidator.predicate(
    "category has id string",
    typeof category.id === "string",
  );

  // 3) Registered user join (actor)
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: userEmail,
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(user);
  TestValidator.predicate(
    "registered user has id string",
    typeof user.id === "string",
  );

  // 4) Create a thread in that category as the registered user
  const threadBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 4, wordMax: 10 }),
    slug: `${RandomGenerator.alphaNumeric(8).toLowerCase()}-${Date.now()}`,
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: threadBody,
      },
    );
  typia.assert(thread);
  TestValidator.equals(
    "thread.category_id matches created category",
    thread.category_id,
    category.id,
  );

  // 5) Create follow via POST create endpoint
  const followRequest = {
    thread_id: thread.id,
  } satisfies IEconPoliticalForumThreadFollow.ICreate;

  const follow: IEconPoliticalForumThreadFollow =
    await api.functional.econPoliticalForum.registeredUser.threads.follows.create(
      connection,
      {
        threadId: thread.id,
        body: followRequest,
      },
    );
  typia.assert(follow);

  TestValidator.equals(
    "follow.thread_id matches thread",
    follow.thread_id,
    thread.id,
  );
  TestValidator.equals(
    "follow.registereduser_id matches actor user id",
    follow.registereduser_id,
    user.id,
  );
  TestValidator.predicate(
    "follow.created_at is present",
    typeof follow.created_at === "string",
  );

  // 6) Duplicate upsert (idempotency): re-invoke create to ensure server returns same follow
  const followDuplicate: IEconPoliticalForumThreadFollow =
    await api.functional.econPoliticalForum.registeredUser.threads.follows.create(
      connection,
      {
        threadId: thread.id,
        body: followRequest,
      },
    );
  typia.assert(followDuplicate);

  TestValidator.equals(
    "duplicate create returns same follow id",
    followDuplicate.id,
    follow.id,
  );
  TestValidator.equals(
    "duplicate create has same owner",
    followDuplicate.registereduser_id,
    follow.registereduser_id,
  );
  TestValidator.equals(
    "duplicate create has same thread",
    followDuplicate.thread_id,
    follow.thread_id,
  );

  // Limitation note: No direct unfollow/soft-delete endpoint available in SDK.
  // If PATCH/DELETE endpoints are provided for follows in the future, add
  // tests that:
  //  - perform unfollow (soft-delete) and assert deleted_at is set
  //  - re-create or call upsert to verify reactivation clears deleted_at
  //  - assert listing behavior excludes soft-deleted follows for ordinary callers
}

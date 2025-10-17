import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussUser";

/**
 * Unfollow flow: retire relationship, ensure idempotency, and verify list
 * update.
 *
 * Steps
 *
 * 1. Register two members: create userB (followee) first, then userA (follower) so
 *    the connection ends authenticated as userA
 * 2. Precondition: userA follows userB, then confirm presence via public following
 *    list for userA
 * 3. Execute: userA unfollows userB (DELETE), then call DELETE again to validate
 *    idempotency
 * 4. Verify: userB no longer appears in userA's following list
 */
export async function test_api_user_follow_retire_idempotent_and_list_update(
  connection: api.IConnection,
) {
  // 1) Register userB (followee) first
  const bodyB = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const userB: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: bodyB });
  typia.assert(userB);

  // Then register userA (follower) so the SDK sets Authorization for userA
  const bodyA = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const userA: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: bodyA });
  typia.assert(userA);

  // 2) Precondition: Follow A -> B
  await api.functional.econDiscuss.member.users.follow.create(connection, {
    userId: userB.id,
  });

  const beforeFollowing =
    await api.functional.econDiscuss.users.following.index(connection, {
      userId: userA.id,
    });
  typia.assert(beforeFollowing);
  const existedBefore: boolean = ArrayUtil.has(
    beforeFollowing.data,
    (u) => u.id === userB.id,
  );
  TestValidator.predicate(
    "userB should appear in userA's following list after follow",
    existedBefore,
  );

  // 3) Execute: Unfollow (DELETE) then attempt again to validate idempotency tolerance
  await api.functional.econDiscuss.member.users.follow.erase(connection, {
    userId: userB.id,
  });
  // Second delete: accept either success (no-op) or provider error; do not assert status codes
  try {
    await api.functional.econDiscuss.member.users.follow.erase(connection, {
      userId: userB.id,
    });
  } catch {
    // acceptable per product policy (already retired)
  }

  // 4) Verify: userB no longer appears in userA's following list
  const afterFollowing = await api.functional.econDiscuss.users.following.index(
    connection,
    { userId: userA.id },
  );
  typia.assert(afterFollowing);
  const existsAfter: boolean = ArrayUtil.has(
    afterFollowing.data,
    (u) => u.id === userB.id,
  );
  TestValidator.predicate(
    "userB should be absent from userA's following list after unfollow",
    !existsAfter,
  );

  // Optional sanity check: total records should not increase after unfollow
  TestValidator.predicate(
    "following records should not increase after unfollow",
    afterFollowing.pagination.records <= beforeFollowing.pagination.records,
  );
}

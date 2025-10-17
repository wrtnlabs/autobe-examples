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
 * Create a follow edge, verify idempotency on duplicates, and reject
 * self-follow.
 *
 * Business flow:
 *
 * 1. Register userB (followee), then userA (follower). SDK auto-sets the
 *    Authorization header, so joining userA last ensures subsequent member
 *    endpoints run as userA.
 * 2. UserA follows userB via POST /econDiscuss/member/users/{userId}/follow.
 * 3. Repeat the follow to validate idempotency (success or acceptable error
 *    without status assertion).
 * 4. Verify with GET /econDiscuss/users/{userId}/following that userB appears in
 *    userA's followees.
 * 5. Negative case: userA attempts to follow self; expect an error.
 */
export async function test_api_user_follow_create_idempotent_and_self_follow_rejected(
  connection: api.IConnection,
) {
  // 1) Create users via join
  const joinBodyB = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconDiscussMember.ICreate;
  const authB: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBodyB });
  typia.assert(authB);

  const joinBodyA = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const authA: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBodyA });
  typia.assert(authA);

  // 2) userA follows userB
  await api.functional.econDiscuss.member.users.follow.create(connection, {
    userId: authB.id,
  });

  // 3) Idempotency: duplicate follow should be safe
  try {
    await api.functional.econDiscuss.member.users.follow.create(connection, {
      userId: authB.id,
    });
  } catch (_) {
    // Accept error on duplicate follow without asserting specific status codes
  }

  // 4) Verify userB appears in userA's following list
  const page = await api.functional.econDiscuss.users.following.index(
    connection,
    {
      userId: authA.id,
    },
  );
  typia.assert(page);
  const found = page.data.find((u) => u.id === authB.id);
  TestValidator.predicate(
    "userB should appear in userA's following list",
    found !== undefined,
  );

  // 5) Negative: userA attempts to follow self → expect error
  await TestValidator.error("self-follow must be rejected", async () => {
    await api.functional.econDiscuss.member.users.follow.create(connection, {
      userId: authA.id,
    });
  });
}

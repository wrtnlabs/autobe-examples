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
 * Validate follow listing deduplication under idempotent follow writes.
 *
 * This test ensures that creating a follow edge twice does not duplicate the
 * relationship and that listing followees returns the followed user exactly
 * once.
 *
 * Steps:
 *
 * 1. Create Member A (follower) with its own connection (auto-auth to A).
 * 2. Create Member B (followee) with a separate connection (auto-auth to B).
 * 3. As A, call follow-create to B twice (idempotent write behavior).
 * 4. List A's followees and assert B appears exactly once and IDs are unique.
 */
export async function test_api_following_list_idempotent_edges(
  connection: api.IConnection,
) {
  // Prepare isolated connections for A and B without touching existing headers
  const aConn: api.IConnection = { ...connection, headers: {} };
  const bConn: api.IConnection = { ...connection, headers: {} };

  // 1) Create Member A (auto-auth applied to aConn)
  const aJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const aAuth = await api.functional.auth.member.join(aConn, {
    body: aJoinBody,
  });
  typia.assert(aAuth);

  // 2) Create Member B (auto-auth applied to bConn)
  const bJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const bAuth = await api.functional.auth.member.join(bConn, {
    body: bJoinBody,
  });
  typia.assert(bAuth);

  // Sanity: distinct users
  TestValidator.notEquals(
    "A and B must be different users",
    aAuth.id,
    bAuth.id,
  );

  // 3) As A, follow B twice (idempotent)
  await api.functional.econDiscuss.member.users.follow.create(aConn, {
    userId: bAuth.id,
  });
  // Duplicate attempt should be safe (no duplicate edge created)
  await api.functional.econDiscuss.member.users.follow.create(aConn, {
    userId: bAuth.id,
  });

  // 4) List A's followees
  const page = await api.functional.econDiscuss.users.following.index(
    connection,
    {
      userId: aAuth.id,
    },
  );
  typia.assert(page);

  // Validate B appears exactly once
  const occurrences = page.data.filter((u) => u.id === bAuth.id).length;
  TestValidator.equals(
    "B should appear exactly once in A's followees after duplicate follow attempts",
    occurrences,
    1,
  );

  // Validate global uniqueness of IDs in the followees list
  const uniqueCount = new Set(page.data.map((u) => u.id)).size;
  TestValidator.equals(
    "followees listing must not contain duplicate user IDs",
    page.data.length,
    uniqueCount,
  );
}

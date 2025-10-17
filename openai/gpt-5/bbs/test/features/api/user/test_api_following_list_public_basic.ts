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
 * Public followees list for a user (basic happy path).
 *
 * Flow:
 *
 * 1. Create three users via join: A (follower), B & C (followees).
 * 2. Keep the main connection authenticated as A; join B and C with cloned
 *    unauthenticated connections so the primary token remains A.
 * 3. As A, follow B and C using the authenticated member endpoint.
 * 4. Call the public endpoint to list A's followees without authentication.
 * 5. Validate pagination shape, that exactly B and C are listed, and ordering is
 *    stable across repeated calls.
 */
export async function test_api_following_list_public_basic(
  connection: api.IConnection,
) {
  // 1) Join A (follower) on the primary connection (Authorization will be set to A)
  const aJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const aAuth = await api.functional.auth.member.join(connection, {
    body: aJoinBody,
  });
  typia.assert(aAuth);

  // 2) Join B on an isolated connection so as not to overwrite A's token
  const bConn: api.IConnection = { ...connection, headers: {} };
  const bJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const bAuth = await api.functional.auth.member.join(bConn, {
    body: bJoinBody,
  });
  typia.assert(bAuth);

  // 3) Join C on another isolated connection
  const cConn: api.IConnection = { ...connection, headers: {} };
  const cJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const cAuth = await api.functional.auth.member.join(cConn, {
    body: cJoinBody,
  });
  typia.assert(cAuth);

  // 4) As A, follow B and C
  await api.functional.econDiscuss.member.users.follow.create(connection, {
    userId: bAuth.id,
  });
  await api.functional.econDiscuss.member.users.follow.create(connection, {
    userId: cAuth.id,
  });

  // 5) Public listing of A's followees (use unauthenticated connection)
  const publicConn: api.IConnection = { ...connection, headers: {} };
  const page1 = await api.functional.econDiscuss.users.following.index(
    publicConn,
    {
      userId: aAuth.id,
    },
  );
  typia.assert(page1);

  // Validate exactly two followees
  TestValidator.equals("exactly two followees returned", page1.data.length, 2);

  // Validate that returned ids equal {B.id, C.id} (order-insensitive)
  const gotIds1 = page1.data
    .map((u) => u.id)
    .slice()
    .sort();
  const expectedIds = [bAuth.id, cAuth.id].slice().sort();
  TestValidator.equals(
    "returned ids match B and C (order-insensitive)",
    gotIds1,
    expectedIds,
  );

  // 6) Ordering stability across consecutive requests
  const page2 = await api.functional.econDiscuss.users.following.index(
    publicConn,
    {
      userId: aAuth.id,
    },
  );
  typia.assert(page2);
  const gotIds2 = page2.data.map((u) => u.id);
  TestValidator.equals(
    "stable ordering across calls (id sequence)",
    gotIds2,
    page1.data.map((u) => u.id),
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEEconDiscussUserFollowSortBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussUserFollowSortBy";
import type { IESortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IESortOrder";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussUser";
import type { IEconDiscussUserFollow } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussUserFollow";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussUser";

/**
 * Validate follower search pagination and default recency ordering.
 *
 * Flow:
 *
 * 1. Register Target user T (followee)
 * 2. Register F1 and follow T (auth: F1)
 * 3. Register F2 and follow T (auth: F2)
 * 4. Search followers (page=1,pageSize=1) and expect F2 (most recent)
 * 5. Search followers (page=2,pageSize=1) and expect F1
 * 6. Re-run follow as F2 (idempotency) and assert total records remain 2
 *
 * Notes:
 *
 * - Authentication tokens are handled automatically by the SDK on each join.
 * - Sorting defaults to created_at desc when omitted.
 * - Validates only business logic (no status code or type error testing).
 */
export async function test_api_followers_search_pagination_and_ordering(
  connection: api.IConnection,
) {
  // 1) Register Target user T
  const joinBodyT = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const tAuth: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBodyT });
  typia.assert(tAuth);

  // 2) Register F1 and follow T (auth switches to F1)
  const joinBodyF1 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const f1Auth: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBodyF1 });
  typia.assert(f1Auth);

  await api.functional.econDiscuss.member.users.follow.create(connection, {
    userId: tAuth.id,
  });

  // 3) Register F2 and follow T (auth switches to F2)
  const joinBodyF2 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const f2Auth: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBodyF2 });
  typia.assert(f2Auth);

  await api.functional.econDiscuss.member.users.follow.create(connection, {
    userId: tAuth.id,
  });

  // 4) Search followers of T, page=1,pageSize=1 → expect F2 (most recent)
  const page1 = await api.functional.econDiscuss.users.followers.search(
    connection,
    {
      userId: tAuth.id,
      body: {
        page: 1,
        pageSize: 1,
      } satisfies IEconDiscussUserFollow.IRequest,
    },
  );
  typia.assert(page1);

  TestValidator.equals(
    "page1 returns exactly one follower",
    page1.data.length,
    1,
  );
  TestValidator.equals(
    "page1.limit equals requested pageSize (1)",
    page1.pagination.limit,
    1,
  );
  TestValidator.equals(
    "total follower records should be 2",
    page1.pagination.records,
    2,
  );
  TestValidator.equals(
    "most recent follower should be F2 on page1",
    page1.data[0]!.id,
    f2Auth.id,
  );

  // 5) Search followers of T, page=2,pageSize=1 → expect F1
  const page2 = await api.functional.econDiscuss.users.followers.search(
    connection,
    {
      userId: tAuth.id,
      body: {
        page: 2,
        pageSize: 1,
      } satisfies IEconDiscussUserFollow.IRequest,
    },
  );
  typia.assert(page2);

  TestValidator.equals(
    "page2 returns exactly one follower",
    page2.data.length,
    1,
  );
  TestValidator.equals(
    "page2.limit equals requested pageSize (1)",
    page2.pagination.limit,
    1,
  );
  TestValidator.equals(
    "older follower should be F1 on page2",
    page2.data[0]!.id,
    f1Auth.id,
  );

  // 6) Idempotency: re-follow as F2 should not create duplicates
  await api.functional.econDiscuss.member.users.follow.create(connection, {
    userId: tAuth.id,
  });

  const allFollowers = await api.functional.econDiscuss.users.followers.search(
    connection,
    {
      userId: tAuth.id,
      body: {
        page: 1,
        pageSize: 10,
      } satisfies IEconDiscussUserFollow.IRequest,
    },
  );
  typia.assert(allFollowers);

  TestValidator.equals(
    "total follower records remain 2 after idempotent follow",
    allFollowers.pagination.records,
    2,
  );

  const followerIds = allFollowers.data.map((u) => u.id);
  TestValidator.predicate(
    "followers include F1 and F2",
    followerIds.includes(f1Auth.id) && followerIds.includes(f2Auth.id),
  );
  TestValidator.equals(
    "no duplicate followers present",
    new Set(followerIds).size,
    followerIds.length,
  );
}

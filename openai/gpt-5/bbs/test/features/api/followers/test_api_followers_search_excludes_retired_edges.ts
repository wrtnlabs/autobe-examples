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
 * Verify follower search excludes retired (unfollowed) edges.
 *
 * Steps:
 *
 * 1. Register target user T and record its id.
 * 2. Register follower user F (auth becomes F by SDK behavior).
 * 3. As F, follow T (POST follow) to create an active edge.
 * 4. As F, unfollow T (DELETE follow) to retire the edge (sets deleted_at).
 * 5. Search followers for T using PATCH followers.search, and assert that F is not
 *    included.
 *
 * Notes:
 *
 * - Only call typia.assert on non-void responses.
 * - Do not test HTTP status codes or type errors.
 * - Never manipulate connection.headers directly; SDK manages auth tokens.
 */
export async function test_api_followers_search_excludes_retired_edges(
  connection: api.IConnection,
) {
  // 1) Register target user T
  const targetJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const targetAuth: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: targetJoinBody });
  typia.assert(targetAuth);
  const targetUserId = targetAuth.id;

  // 2) Register follower user F (SDK sets Authorization token to F)
  const followerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const followerAuth: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: followerJoinBody,
    });
  typia.assert(followerAuth);
  const followerUserId = followerAuth.id;

  // 3) As F, follow T (establish active edge)
  await api.functional.econDiscuss.member.users.follow.create(connection, {
    userId: targetUserId,
  });

  // 4) As F, unfollow T (retire edge: sets deleted_at)
  await api.functional.econDiscuss.member.users.follow.erase(connection, {
    userId: targetUserId,
  });

  // 5) Search followers of T and verify F is excluded
  const searchBody = {
    page: 1,
    pageSize: 10,
    q: null,
    dateFrom: null,
    dateTo: null,
  } satisfies IEconDiscussUserFollow.IRequest;

  const page = await api.functional.econDiscuss.users.followers.search(
    connection,
    {
      userId: targetUserId,
      body: searchBody,
    },
  );
  typia.assert(page);

  TestValidator.predicate(
    "retired follow edge must be excluded from follower search results",
    page.data.every((u) => u.id !== followerUserId),
  );
}

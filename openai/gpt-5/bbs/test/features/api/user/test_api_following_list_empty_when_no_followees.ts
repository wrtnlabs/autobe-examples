import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEEconDiscussUserSortBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussUserSortBy";
import type { IESortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IESortOrder";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussUser";

/**
 * Following list is empty when the user follows no one (publicly readable).
 *
 * Steps:
 *
 * 1. Register a fresh member to get a valid userId (no follow edges exist).
 * 2. Call PATCH /econDiscuss/users/{userId}/following with page=1, pageSize=5.
 * 3. Validate empty results and zero totals.
 * 4. Repeat the same request without Authorization header to confirm public
 *    access.
 */
export async function test_api_following_list_empty_when_no_followees(
  connection: api.IConnection,
) {
  // 1) Register a fresh member (obtain userId)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd123",
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const authorized = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // Prepare request body for followees listing
  const req = {
    page: 1,
    pageSize: 5,
    q: null,
    isExpertOnly: null,
    sortBy: null,
    order: null,
  } satisfies IEconDiscussUser.IRequest;

  // 2) Authenticated call
  const authedPage = await api.functional.econDiscuss.users.following.search(
    connection,
    {
      userId: authorized.id,
      body: req,
    },
  );
  typia.assert(authedPage);

  // 3) Validations: empty data and zero totals
  TestValidator.equals(
    "authed: data array should be empty",
    authedPage.data.length,
    0,
  );
  TestValidator.equals(
    "authed: total records should be zero",
    authedPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "authed: total pages should be zero",
    authedPage.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "authed: current page should be 0 or requested page (service-dependent)",
    authedPage.pagination.current === 0 ||
      authedPage.pagination.current === req.page,
  );

  // 4) Public access (no Authorization header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const publicPage = await api.functional.econDiscuss.users.following.search(
    unauthConn,
    {
      userId: authorized.id,
      body: req,
    },
  );
  typia.assert(publicPage);

  // Public validations mirror authenticated ones
  TestValidator.equals(
    "public: data array should be empty",
    publicPage.data.length,
    0,
  );
  TestValidator.equals(
    "public: total records should be zero",
    publicPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "public: total pages should be zero",
    publicPage.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "public: current page should be 0 or requested page (service-dependent)",
    publicPage.pagination.current === 0 ||
      publicPage.pagination.current === req.page,
  );

  // Cross-check consistency between authed and public responses on empty aspects
  TestValidator.equals(
    "authed/public: empty data length matches",
    authedPage.data.length,
    publicPage.data.length,
  );
  TestValidator.equals(
    "authed/public: zero records consistent",
    authedPage.pagination.records,
    publicPage.pagination.records,
  );
  TestValidator.equals(
    "authed/public: zero pages consistent",
    authedPage.pagination.pages,
    publicPage.pagination.pages,
  );
}

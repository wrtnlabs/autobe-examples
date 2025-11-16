import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestriction";
import type { ICommunityPlatformAccountRestrictionOfAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfAdminUser";
import type { ICommunityPlatformAccountRestrictionOfMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfMemberUser";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberuser";

/**
 * Validate admin-side time range listing queries for member users.
 *
 * Business intent:
 *
 * - Admins use PATCH /communityPlatform/adminUser/memberUsers with
 *   ICommunityPlatformMemberuser.IRequest filters as an audit/analytics tool.
 * - We need to ensure that time range filters for createdFrom/createdTo and
 *   updatedFrom/updatedTo can be used safely together with pagination, and that
 *   the endpoint always returns a well-formed paginated page structure even
 *   when the filter window yields no results.
 *
 * Constraints from available APIs/DTOs:
 *
 * - We can authenticate an adminUser via api.functional.auth.adminUser.join using
 *   ICommunityPlatformAdminUserJoin.IRequest.
 * - We can create a generic account restriction via
 *   api.functional.communityPlatform.adminUser.accountRestrictions.create using
 *   ICommunityPlatformAccountRestriction.ICreate to satisfy the dependency that
 *   there is at least one restriction definition.
 * - We do NOT have any API to create or mutate member users, and
 *   ICommunityPlatformMemberuser.ISummary does not expose created_at or
 *   updated_at, so we cannot directly assert per-record timestamps.
 *
 * Therefore this test focuses on:
 *
 * - Successful usage of time range parameters in the request body.
 * - Correct page structure and safe handling of empty result sets when using
 *   obviously-empty time ranges.
 *
 * Flow:
 *
 * 1. Admin join
 *
 *    - Call auth.adminUser.join with a random, valid request body and assert that we
 *         receive ICommunityPlatformAdminuser.IAuthorized.
 *    - This call will also populate connection.headers.Authorization.
 * 2. Baseline account restriction
 *
 *    - Call communityPlatform.adminUser.accountRestrictions.create with a simple
 *         ICommunityPlatformAccountRestriction.ICreate body (e.g.
 *         account_type="memberUser", scope="login", reason_category="policy",
 *         starts_at=now, ends_at=now+1h) and assert the response type.
 * 3. Baseline member listing without time filters
 *
 *    - Call memberUsers.index with a body containing page/pageSize and
 *         sortField/sortOrder only.
 *    - Assert that the response is IPageICommunityPlatformMemberuser.ISummary.
 *    - Use TestValidator to check basic pagination invariants:
 *
 *         - Pagination.current === requested page.
 *         - Pagination.limit === requested pageSize.
 *         - Pagination.records and pagination.pages are >= 0.
 *         - Data.length <= pagination.limit.
 * 4. Created_at future window that should normally be empty
 *
 *    - Build a request body with page=1, pageSize=1, sortField set, and a
 *         createdFrom/createdTo window in the far future (e.g. 2100-01-01 to
 *         2100-01-02) where no records are expected in a typical test
 *         environment.
 *    - Call memberUsers.index and assert the response type.
 *    - Assert that pagination.current and limit match the request, and that
 *         data.length <= limit.
 *    - If data.length === 0, we have validated that empty sets are handled
 *         gracefully. If data.length > 0 (unusual but possible in seeded
 *         environments), we still regard the structure as valid and rely on the
 *         backend to enforce date semantics since timestamps are not present in
 *         ISummary.
 * 5. Updated_at future window with updatedFrom/updatedTo
 *
 *    - Repeat step 4 but using updatedFrom/updatedTo instead of
 *         createdFrom/createdTo, again with a far-future window.
 *    - Assert the same pagination invariants and structural correctness.
 * 6. General invariants across queries
 *
 *    - For each call, typia.assert() over the response ensures full type
 *         correctness, including pagination and member summary items.
 *    - TestValidator is used only for simple business-level consistency like page
 *         index, limit, and data length being within the limit.
 */
export async function test_api_admin_memberuser_index_time_range_queries(
  connection: api.IConnection,
) {
  // 1. Admin join
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const authorized = await api.functional.auth.adminUser.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(authorized);

  // 2. Create a baseline account restriction for dependency
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  const restrictionBody = {
    account_type: "memberUser",
    scope: "login",
    reason_category: "policy_violation",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    starts_at: now.toISOString(),
    ends_at: oneHourLater.toISOString(),
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const restriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: restrictionBody,
      },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(restriction);

  // Helper to validate pagination invariants
  const assertPagination = (
    title: string,
    page: number,
    pageSize: number,
    pageResult: IPageICommunityPlatformMemberuser.ISummary,
  ) => {
    const { pagination, data } = pageResult;
    TestValidator.equals(
      `${title} - current page matches`,
      pagination.current,
      page,
    );
    TestValidator.equals(
      `${title} - limit matches`,
      pagination.limit,
      pageSize,
    );
    TestValidator.predicate(
      `${title} - records non-negative`,
      pagination.records >= 0,
    );
    TestValidator.predicate(
      `${title} - pages non-negative`,
      pagination.pages >= 0,
    );
    TestValidator.predicate(
      `${title} - data length within limit`,
      data.length <= pagination.limit,
    );
  };

  // 3. Baseline listing without time filters
  const basePage = 1 as number & tags.Type<"int32">;
  const basePageSize = 10 as number & tags.Type<"int32">;

  const baseRequestBody = {
    page: basePage,
    pageSize: basePageSize,
    sortField: "created_at",
    sortOrder: "desc" as const,
  } satisfies ICommunityPlatformMemberuser.IRequest;

  const baseResult =
    await api.functional.communityPlatform.adminUser.memberUsers.index(
      connection,
      {
        body: baseRequestBody,
      },
    );
  typia.assert<IPageICommunityPlatformMemberuser.ISummary>(baseResult);
  assertPagination("baseline listing", basePage, basePageSize, baseResult);

  // 4. created_at future window
  const createdRangePage = 1 as number & tags.Type<"int32">;
  const createdRangeSize = 1 as number & tags.Type<"int32">;

  const createdFrom = "2100-01-01T00:00:00.000Z" as string &
    tags.Format<"date-time">;
  const createdTo = "2100-01-02T00:00:00.000Z" as string &
    tags.Format<"date-time">;

  const createdRangeBody = {
    page: createdRangePage,
    pageSize: createdRangeSize,
    sortField: "created_at",
    sortOrder: "desc" as const,
    createdFrom,
    createdTo,
  } satisfies ICommunityPlatformMemberuser.IRequest;

  const createdRangeResult =
    await api.functional.communityPlatform.adminUser.memberUsers.index(
      connection,
      {
        body: createdRangeBody,
      },
    );
  typia.assert<IPageICommunityPlatformMemberuser.ISummary>(createdRangeResult);
  assertPagination(
    "created-at future window",
    createdRangePage,
    createdRangeSize,
    createdRangeResult,
  );

  // 5. updated_at future window
  const updatedRangePage = 1 as number & tags.Type<"int32">;
  const updatedRangeSize = 1 as number & tags.Type<"int32">;

  const updatedFrom = "2100-02-01T00:00:00.000Z" as string &
    tags.Format<"date-time">;
  const updatedTo = "2100-02-02T00:00:00.000Z" as string &
    tags.Format<"date-time">;

  const updatedRangeBody = {
    page: updatedRangePage,
    pageSize: updatedRangeSize,
    sortField: "updated_at",
    sortOrder: "desc" as const,
    updatedFrom,
    updatedTo,
  } satisfies ICommunityPlatformMemberuser.IRequest;

  const updatedRangeResult =
    await api.functional.communityPlatform.adminUser.memberUsers.index(
      connection,
      {
        body: updatedRangeBody,
      },
    );
  typia.assert<IPageICommunityPlatformMemberuser.ISummary>(updatedRangeResult);
  assertPagination(
    "updated-at future window",
    updatedRangePage,
    updatedRangeSize,
    updatedRangeResult,
  );
}

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
 * Validate admin security filters for member user index.
 *
 * This test exercises the admin-only PATCH
 * /communityPlatform/adminUser/memberUsers endpoint focusing on security and
 * enforcement related filters such as suspension, bans, failed login count
 * thresholds, and lock state. It also ensures that the admin join and account
 * restriction creation flows coexist with member listing and that all responses
 * conform to the documented DTOs.
 *
 * High level steps:
 *
 * 1. Register a fresh adminUser via POST /auth/adminUser/join to obtain an
 *    authenticated admin context (connection headers are updated by the SDK).
 * 2. Create at least one account restriction episode via POST
 *    /communityPlatform/adminUser/accountRestrictions to simulate the presence
 *    of enforcement configuration.
 * 3. Call PATCH /communityPlatform/adminUser/memberUsers without security filters
 *    to get a baseline page of member summaries.
 * 4. Call the same endpoint with various combinations of security filters:
 *
 *    - IsSuspended: true
 *    - IsBanned: true
 *    - MinFailedLoginCount: high threshold
 *    - Locked: true and locked: false
 * 5. For each response, validate structural correctness with typia.assert and
 *    basic pagination invariants. Where possible, compare filtered vs
 *    unfiltered result sizes using generic expectations (filtered result size
 *    should not exceed the unfiltered size).
 *
 * Note: Because we do not control seeding of member users in this test and the
 * ISummary projection intentionally omits internal enforcement fields, we avoid
 * asserting specific user-level enforcement flags. Instead, we validate that
 * filters are accepted, the endpoint remains stable, and the returned page and
 * summary shapes are correct and usable for a security dashboard.
 */
export async function test_api_admin_memberuser_index_security_and_status_filters(
  connection: api.IConnection,
) {
  // 1. Register a fresh adminUser (authentication context for subsequent calls)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Admin!234" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Create at least one account restriction episode as background data
  const now = new Date();
  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);

  const restrictionBody = {
    account_type: "memberUser",
    scope: "login",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    starts_at: now.toISOString(),
    ends_at: inOneHour.toISOString(),
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const restriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      { body: restrictionBody },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(restriction);

  // Helper to assert basic pagination invariants
  const assertPagination = (
    title: string,
    page: IPageICommunityPlatformMemberuser.ISummary,
  ): void => {
    typia.assert<IPageICommunityPlatformMemberuser.ISummary>(page);
    const { pagination } = page;
    TestValidator.predicate(
      `${title} - current page non-negative`,
      pagination.current >= 0,
    );
    TestValidator.predicate(
      `${title} - limit non-negative`,
      pagination.limit >= 0,
    );
    TestValidator.predicate(
      `${title} - records non-negative`,
      pagination.records >= 0,
    );
    TestValidator.predicate(
      `${title} - pages non-negative`,
      pagination.pages >= 0,
    );
  };

  // 3. Baseline listing without security filters
  const baselineRequest = {
    page: 1 as number & tags.Type<"int32">,
    pageSize: 20 as number & tags.Type<"int32">,
  } satisfies ICommunityPlatformMemberuser.IRequest;

  const baselinePage: IPageICommunityPlatformMemberuser.ISummary =
    await api.functional.communityPlatform.adminUser.memberUsers.index(
      connection,
      { body: baselineRequest },
    );
  assertPagination("baseline", baselinePage);

  const baselineCount: number = baselinePage.data.length;

  // 4-a. Filter by suspended accounts
  const suspendedRequest = {
    page: 1 as number & tags.Type<"int32">,
    pageSize: 20 as number & tags.Type<"int32">,
    isSuspended: true,
  } satisfies ICommunityPlatformMemberuser.IRequest;

  const suspendedPage: IPageICommunityPlatformMemberuser.ISummary =
    await api.functional.communityPlatform.adminUser.memberUsers.index(
      connection,
      { body: suspendedRequest },
    );
  assertPagination("suspended", suspendedPage);
  TestValidator.predicate(
    "suspended filter result size <= baseline",
    suspendedPage.data.length <= baselineCount,
  );

  // 4-b. Filter by banned accounts
  const bannedRequest = {
    page: 1 as number & tags.Type<"int32">,
    pageSize: 20 as number & tags.Type<"int32">,
    isBanned: true,
  } satisfies ICommunityPlatformMemberuser.IRequest;

  const bannedPage: IPageICommunityPlatformMemberuser.ISummary =
    await api.functional.communityPlatform.adminUser.memberUsers.index(
      connection,
      { body: bannedRequest },
    );
  assertPagination("banned", bannedPage);
  TestValidator.predicate(
    "banned filter result size <= baseline",
    bannedPage.data.length <= baselineCount,
  );

  // 4-c. Filter by minimum failed login count (security risk accounts)
  const minFailedLoginRequest = {
    page: 1 as number & tags.Type<"int32">,
    pageSize: 20 as number & tags.Type<"int32">,
    minFailedLoginCount: 3 as number & tags.Type<"int32">,
  } satisfies ICommunityPlatformMemberuser.IRequest;

  const failedLoginPage: IPageICommunityPlatformMemberuser.ISummary =
    await api.functional.communityPlatform.adminUser.memberUsers.index(
      connection,
      { body: minFailedLoginRequest },
    );
  assertPagination("minFailedLoginCount", failedLoginPage);
  TestValidator.predicate(
    "minFailedLoginCount filter result size <= baseline",
    failedLoginPage.data.length <= baselineCount,
  );

  // 4-d. Filter by locked accounts (locked: true)
  const lockedTrueRequest = {
    page: 1 as number & tags.Type<"int32">,
    pageSize: 20 as number & tags.Type<"int32">,
    locked: true,
  } satisfies ICommunityPlatformMemberuser.IRequest;

  const lockedTruePage: IPageICommunityPlatformMemberuser.ISummary =
    await api.functional.communityPlatform.adminUser.memberUsers.index(
      connection,
      { body: lockedTrueRequest },
    );
  assertPagination("locked=true", lockedTruePage);
  TestValidator.predicate(
    "locked=true filter result size <= baseline",
    lockedTruePage.data.length <= baselineCount,
  );

  // 4-e. Filter by unlocked accounts (locked: false)
  const lockedFalseRequest = {
    page: 1 as number & tags.Type<"int32">,
    pageSize: 20 as number & tags.Type<"int32">,
    locked: false,
  } satisfies ICommunityPlatformMemberuser.IRequest;

  const lockedFalsePage: IPageICommunityPlatformMemberuser.ISummary =
    await api.functional.communityPlatform.adminUser.memberUsers.index(
      connection,
      { body: lockedFalseRequest },
    );
  assertPagination("locked=false", lockedFalsePage);
  TestValidator.predicate(
    "locked=false filter result size <= baseline",
    lockedFalsePage.data.length <= baselineCount,
  );

  // 5. Basic projection checks on a subset of results to ensure that
  //    summaries are structurally valid and safe to expose.
  const pagesToInspect: IPageICommunityPlatformMemberuser.ISummary[] = [
    baselinePage,
    suspendedPage,
    bannedPage,
    failedLoginPage,
    lockedTruePage,
    lockedFalsePage,
  ];

  await ArrayUtil.asyncForEach(pagesToInspect, async (page, index) => {
    const label = `page-${index}`;
    await ArrayUtil.asyncForEach(page.data, async (member, memberIndex) => {
      typia.assert<ICommunityPlatformMemberuser.ISummary>(member);
      TestValidator.predicate(
        `${label} member[${memberIndex}] has id`,
        typeof member.id === "string" && member.id.length > 0,
      );
      TestValidator.predicate(
        `${label} member[${memberIndex}] has username`,
        typeof member.username === "string" && member.username.length > 0,
      );
    });
  });
}

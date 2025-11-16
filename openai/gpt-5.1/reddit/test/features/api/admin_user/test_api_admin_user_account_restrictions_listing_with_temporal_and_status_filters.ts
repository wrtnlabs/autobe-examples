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
import type { IPageICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAccountRestriction";

export async function test_api_admin_user_account_restrictions_listing_with_temporal_and_status_filters(
  connection: api.IConnection,
) {
  // 1. Create target admin B (the subject of restrictions)
  const adminBJoinRequest = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminBAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminBJoinRequest,
    });
  typia.assert(adminBAuthorized);

  const targetUsername: string = adminBAuthorized.username;

  // 2. Create acting admin A (the enforcer who manages restrictions)
  const adminAJoinRequest = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminAJoinRequest,
    });
  typia.assert(adminAAuthorized);

  TestValidator.predicate(
    "actor and subject admin usernames should differ",
    adminAAuthorized.username !== adminBAuthorized.username,
  );

  // 3. Prepare temporal windows for restrictions
  const now: Date = new Date();
  const oneHourMs = 60 * 60 * 1000;

  const r1StartsAt: string = new Date(now.getTime() - oneHourMs).toISOString();
  const r1EndsAt: string = new Date(now.getTime() + oneHourMs).toISOString();

  const r2StartsAt: string = new Date(
    now.getTime() - 2 * oneHourMs,
  ).toISOString();
  const r2EndsAt: string = new Date(now.getTime() - oneHourMs).toISOString();

  // 4. Create active restriction R1 for admin B (login, abuse, currently active)
  const r1CreateBody = {
    account_type: "adminUser",
    scope: "login",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    starts_at: r1StartsAt,
    ends_at: r1EndsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const r1: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.adminUsers.accountRestrictions.create(
      connection,
      {
        username: targetUsername,
        body: r1CreateBody,
      },
    );
  typia.assert(r1);

  TestValidator.equals(
    "R1 should target adminUser account type",
    r1.account_type,
    "adminUser",
  );

  // 5. Create expired restriction R2 for admin B (posting, spam, fully in the past)
  const r2CreateBody = {
    account_type: "adminUser",
    scope: "posting",
    reason_category: "spam",
    reason_detail: RandomGenerator.paragraph({ sentences: 2 }),
    starts_at: r2StartsAt,
    ends_at: r2EndsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const r2: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.adminUsers.accountRestrictions.create(
      connection,
      {
        username: targetUsername,
        body: r2CreateBody,
      },
    );
  typia.assert(r2);

  TestValidator.equals(
    "R2 should target adminUser account type",
    r2.account_type,
    "adminUser",
  );

  // 6. Define effective window around now for active listing filters
  const effectiveFromGte: string = new Date(
    now.getTime() - oneHourMs,
  ).toISOString();
  const effectiveFromLte: string = new Date(
    now.getTime() + oneHourMs,
  ).toISOString();

  // 7. List active restrictions (is_active = true) for admin B
  const activeListRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: "created_at",
    sort_direction: "desc" as const,
    subject_username: targetUsername,
    subject_type: "adminUser",
    restriction_type: null,
    is_active: true,
    effective_from_gte: effectiveFromGte,
    effective_from_lte: effectiveFromLte,
    effective_until_gte: null,
    effective_until_lte: null,
    reason_category: null,
    created_at_gte: null,
    created_at_lte: null,
  } satisfies ICommunityPlatformAccountRestriction.IRequest;

  const activePage: IPageICommunityPlatformAccountRestriction.ISummary =
    await api.functional.communityPlatform.adminUser.adminUsers.accountRestrictions.index(
      connection,
      {
        username: targetUsername,
        body: activeListRequestBody,
      },
    );
  typia.assert(activePage);

  const activePagination: IPage.IPagination = activePage.pagination;
  typia.assert(activePagination);

  TestValidator.equals(
    "active page current index should be 1",
    activePagination.current,
    1,
  );

  TestValidator.predicate(
    "active page limit should be at least 1",
    activePagination.limit >= 1,
  );

  TestValidator.predicate(
    "active page should have at least one record",
    activePagination.records >= 1,
  );

  const activeSummaries: ICommunityPlatformAccountRestriction.ISummary[] =
    activePage.data;

  const activeIds: string[] = activeSummaries.map((summary) => summary.id);

  TestValidator.predicate(
    "active listing should contain R1",
    activeIds.includes(r1.id),
  );

  TestValidator.predicate(
    "active listing should not contain R2",
    !activeIds.includes(r2.id),
  );

  for (const summary of activeSummaries) {
    typia.assert<ICommunityPlatformAccountRestriction.ISummary>(summary);

    TestValidator.equals(
      "active summary account_type should be adminUser",
      summary.account_type,
      "adminUser",
    );

    TestValidator.predicate(
      "active summary status should represent an active or pending restriction",
      summary.status === "active" || summary.status === "pending",
    );

    TestValidator.predicate(
      "active summary must have created_by_adminuser populated",
      summary.created_by_adminuser !== null &&
        summary.created_by_adminuser !== undefined,
    );
  }

  // 8. List inactive/expired restrictions (is_active = false) for admin B
  //    For inactive listing we remove effective_from filters so that past
  //    restrictions such as R2 are not excluded by the temporal window.
  const inactiveListRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: "created_at",
    sort_direction: "desc" as const,
    subject_username: targetUsername,
    subject_type: "adminUser",
    restriction_type: null,
    is_active: false,
    effective_from_gte: null,
    effective_from_lte: null,
    effective_until_gte: null,
    effective_until_lte: null,
    reason_category: null,
    created_at_gte: null,
    created_at_lte: null,
  } satisfies ICommunityPlatformAccountRestriction.IRequest;

  const inactivePage: IPageICommunityPlatformAccountRestriction.ISummary =
    await api.functional.communityPlatform.adminUser.adminUsers.accountRestrictions.index(
      connection,
      {
        username: targetUsername,
        body: inactiveListRequestBody,
      },
    );
  typia.assert(inactivePage);

  const inactivePagination: IPage.IPagination = inactivePage.pagination;
  typia.assert(inactivePagination);

  TestValidator.equals(
    "inactive page current index should be 1",
    inactivePagination.current,
    1,
  );

  TestValidator.predicate(
    "inactive page limit should be at least 1",
    inactivePagination.limit >= 1,
  );

  TestValidator.predicate(
    "inactive page should have at least one record",
    inactivePagination.records >= 1,
  );

  const inactiveSummaries: ICommunityPlatformAccountRestriction.ISummary[] =
    inactivePage.data;

  const inactiveIds: string[] = inactiveSummaries.map((summary) => summary.id);

  TestValidator.predicate(
    "inactive listing should contain R2",
    inactiveIds.includes(r2.id),
  );

  TestValidator.predicate(
    "inactive listing should not contain R1",
    !inactiveIds.includes(r1.id),
  );

  for (const summary of inactiveSummaries) {
    typia.assert<ICommunityPlatformAccountRestriction.ISummary>(summary);

    TestValidator.equals(
      "inactive summary account_type should be adminUser",
      summary.account_type,
      "adminUser",
    );

    TestValidator.predicate(
      "inactive summary status should not be active",
      summary.status !== "active",
    );
  }
}

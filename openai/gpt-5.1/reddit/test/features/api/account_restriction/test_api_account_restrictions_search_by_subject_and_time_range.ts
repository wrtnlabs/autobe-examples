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

/**
 * Validate that an adminUser can search account restriction episodes
 * constrained by effective time range and receive a paginated summary
 * response.
 *
 * Business flow:
 *
 * 1. Admin joins via POST /auth/adminUser/join which also authenticates the
 *    connection with an admin JWT.
 * 2. Admin creates two restriction episodes via POST
 *    /communityPlatform/adminUser/accountRestrictions:
 *
 *    - Restriction A: effective window entirely inside the filter range.
 *    - Restriction B: effective window entirely outside the filter range.
 * 3. Admin invokes PATCH /communityPlatform/adminUser/accountRestrictions with
 *    ICommunityPlatformAccountRestriction.IRequest including effective_from_gte
 *    and effective_from_lte that should only match Restriction A.
 * 4. Verify that the response is an
 *    IPageICommunityPlatformAccountRestriction.ISummary and that all returned
 *    items have started_at/ends_at inside the requested time window.
 */
export async function test_api_account_restrictions_search_by_subject_and_time_range(
  connection: api.IConnection,
) {
  // 1. Admin joins and becomes authenticated
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create two restriction episodes with distinct effective windows
  const now = new Date();
  const oneHourMs = 60 * 60 * 1000;

  // Filter window: from now to now + 4h
  const filterFrom = new Date(now.getTime() + 0 * oneHourMs);
  const filterUntil = new Date(now.getTime() + 4 * oneHourMs);
  const filterFromIso = filterFrom.toISOString();
  const filterUntilIso = filterUntil.toISOString();

  // Restriction A: fully inside [filterFrom, filterUntil]
  const restrictionAStarts = new Date(now.getTime() + 1 * oneHourMs);
  const restrictionAEnds = new Date(now.getTime() + 2 * oneHourMs);

  const createBodyA = {
    account_type: "memberUser",
    scope: "posting_ban",
    reason_category: "policy_violation",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    starts_at: restrictionAStarts.toISOString(),
    ends_at: restrictionAEnds.toISOString(),
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const createdA: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: createBodyA,
      },
    );
  typia.assert(createdA);

  // Restriction B: completely outside filter window (before)
  const restrictionBStarts = new Date(now.getTime() - 4 * oneHourMs);
  const restrictionBEnds = new Date(now.getTime() - 3 * oneHourMs);

  const createBodyB = {
    account_type: "memberUser",
    scope: "posting_ban",
    reason_category: "policy_violation",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    starts_at: restrictionBStarts.toISOString(),
    ends_at: restrictionBEnds.toISOString(),
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const createdB: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: createBodyB,
      },
    );
  typia.assert(createdB);

  // 3. Search with effective_from_gte / effective_from_lte constrained window
  const requestBody = {
    page: 1,
    limit: 20,
    sort_by: "created_at",
    sort_direction: "asc" as const,
    subject_username: null,
    subject_type: null,
    restriction_type: null,
    is_active: null,
    effective_from_gte: filterFromIso,
    effective_from_lte: filterUntilIso,
    effective_until_gte: null,
    effective_until_lte: null,
    reason_category: null,
    created_at_gte: null,
    created_at_lte: null,
  } satisfies ICommunityPlatformAccountRestriction.IRequest;

  const page: IPageICommunityPlatformAccountRestriction.ISummary =
    await api.functional.communityPlatform.adminUser.accountRestrictions.index(
      connection,
      { body: requestBody },
    );
  typia.assert(page);

  const { data } = page;

  // 4. Validate that every returned episode is within the requested window by started_at
  for (const summary of data) {
    const startedAt = new Date(summary.started_at);
    const endsAt: Date | null =
      summary.ends_at !== null && summary.ends_at !== undefined
        ? new Date(summary.ends_at)
        : null;

    TestValidator.predicate(
      "restriction started_at is on or after effective_from_gte",
      startedAt.getTime() >= filterFrom.getTime(),
    );

    TestValidator.predicate(
      "restriction started_at is on or before effective_from_lte",
      startedAt.getTime() <= filterUntil.getTime(),
    );

    if (endsAt !== null) {
      TestValidator.predicate(
        "restriction ends_at is not before effective_from_gte when ends_at exists",
        endsAt.getTime() >= filterFrom.getTime(),
      );
    }
  }

  // 5. Ensure no restriction with started_at outside requested range is returned
  const hasOutOfRangeByStart = ArrayUtil.has(data, (summary) => {
    const startedAt = new Date(summary.started_at);
    return (
      startedAt.getTime() < filterFrom.getTime() ||
      startedAt.getTime() > filterUntil.getTime()
    );
  });

  TestValidator.predicate(
    "no restriction with started_at outside requested range is returned",
    !hasOutOfRangeByStart,
  );
}

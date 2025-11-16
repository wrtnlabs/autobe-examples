import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPolicySetting";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";

/**
 * Verify that policy settings search respects active flag and effective period
 * filters.
 *
 * Business rule:
 *
 * - The search endpoint PATCH /shoppingMall/platformAdmin/policySettings should
 *   be able to narrow results by `active` flag and effective period fields so
 *   that specific profiles can be targeted by appropriate time-window filters.
 *
 * Test flow:
 *
 * 1. Join as a new platform admin so that subsequent calls are authenticated as
 *    platformAdmin.
 * 2. Create two policy setting profiles with distinct, fixed effective periods:
 *
 *    - Profile A: active=true with effective_from and effective_to set to concrete
 *         timestamps T1 and T2.
 *    - Profile B: active=true with effective_from and effective_to set to later
 *         timestamps T3 and T4, disjoint from [T1, T2].
 * 3. Search with a filter window around [T1, T2] that includes Profile A but
 *    excludes Profile B by using tight bounds for
 *    effectiveFromGte/effectiveFromLte and looser bounds for
 *    effectiveToGte/effectiveToLte.
 * 4. Assert that the search result includes Profile A and does not include Profile
 *    B.
 * 5. Search with a different filter window around [T3, T4] that includes Profile B
 *    but excludes Profile A by inverting the strategy.
 * 6. Assert that the search result includes Profile B and not Profile A.
 */
export async function test_api_platform_admin_policy_settings_search_effective_period_and_active_state(
  connection: api.IConnection,
) {
  // 1. Join as platform admin so that Authorization header is configured.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // Use a fixed reference point for deterministic effective periods.
  const base = new Date();

  const A_FROM = new Date(base.getTime() + 10 * 60 * 1000); // +10 minutes
  const A_TO = new Date(base.getTime() + 20 * 60 * 1000); // +20 minutes

  const B_FROM = new Date(base.getTime() + 40 * 60 * 1000); // +40 minutes
  const B_TO = new Date(base.getTime() + 50 * 60 * 1000); // +50 minutes

  const A_FROM_ISO = A_FROM.toISOString();
  const A_TO_ISO = A_TO.toISOString();
  const B_FROM_ISO = B_FROM.toISOString();
  const B_TO_ISO = B_TO.toISOString();

  // 2. Create Profile A: effective in [A_FROM, A_TO].
  const profileACode = `policy_A_${RandomGenerator.alphaNumeric(8)}`;
  const profileAName = `Profile A ${RandomGenerator.name(1)}`;

  const createABody = {
    code: profileACode,
    name: profileAName,
    category: "cancellation",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    config_payload: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    effective_from: A_FROM_ISO,
    effective_to: A_TO_ISO,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const profileA: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: createABody },
    );
  typia.assert(profileA);

  // 2. Create Profile B: effective in [B_FROM, B_TO], disjoint from A.
  const profileBCode = `policy_B_${RandomGenerator.alphaNumeric(8)}`;
  const profileBName = `Profile B ${RandomGenerator.name(1)}`;

  const createBBody = {
    code: profileBCode,
    name: profileBName,
    category: "cancellation",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    config_payload: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    effective_from: B_FROM_ISO,
    effective_to: B_TO_ISO,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const profileB: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: createBBody },
    );
  typia.assert(profileB);

  // 3. Search for policies tightly around A's effective_from range.
  // We constrain effective_from to a narrow window that A falls into, and allow
  // a wide range for effective_to so that A is included and B is not.
  const currentSearchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 20 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    categories: ["cancellation"],
    active: true,
    effectiveFromGte: new Date(A_FROM.getTime() - 1 * 60 * 1000).toISOString(),
    effectiveFromLte: new Date(A_FROM.getTime() + 1 * 60 * 1000).toISOString(),
    effectiveToGte: new Date(base.getTime()).toISOString(),
    effectiveToLte: new Date(
      base.getTime() + 24 * 60 * 60 * 1000,
    ).toISOString(),
    orderBy: "code",
    orderDirection: "asc",
  } satisfies IShoppingMallPolicySetting.IRequest;

  const currentPage: IPageIShoppingMallPolicySetting.ISummary =
    await api.functional.shoppingMall.platformAdmin.policySettings.index(
      connection,
      { body: currentSearchBody },
    );
  typia.assert(currentPage);

  const currentSummaries = currentPage.data;

  const foundAInCurrent = currentSummaries.find(
    (s) => s.id === profileA.id && s.code === profileA.code,
  );
  const foundBInCurrent = currentSummaries.find(
    (s) => s.id === profileB.id && s.code === profileB.code,
  );

  TestValidator.predicate(
    "search around A's effective_from should include Profile A",
    !!foundAInCurrent,
  );
  TestValidator.predicate(
    "search around A's effective_from should exclude Profile B",
    !foundBInCurrent,
  );

  TestValidator.predicate(
    "pagination records must be at least number of returned items (A window)",
    currentPage.pagination.records >= currentSummaries.length,
  );

  // 4. Search for policies tightly around B's effective_from range.
  const futureSearchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 20 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    categories: ["cancellation"],
    active: true,
    effectiveFromGte: new Date(B_FROM.getTime() - 1 * 60 * 1000).toISOString(),
    effectiveFromLte: new Date(B_FROM.getTime() + 1 * 60 * 1000).toISOString(),
    effectiveToGte: new Date(base.getTime()).toISOString(),
    effectiveToLte: new Date(
      base.getTime() + 24 * 60 * 60 * 1000,
    ).toISOString(),
    orderBy: "code",
    orderDirection: "asc",
  } satisfies IShoppingMallPolicySetting.IRequest;

  const futurePage: IPageIShoppingMallPolicySetting.ISummary =
    await api.functional.shoppingMall.platformAdmin.policySettings.index(
      connection,
      { body: futureSearchBody },
    );
  typia.assert(futurePage);

  const futureSummaries = futurePage.data;

  const foundAInFuture = futureSummaries.find(
    (s) => s.id === profileA.id && s.code === profileA.code,
  );
  const foundBInFuture = futureSummaries.find(
    (s) => s.id === profileB.id && s.code === profileB.code,
  );

  TestValidator.predicate(
    "search around B's effective_from should exclude Profile A",
    !foundAInFuture,
  );
  TestValidator.predicate(
    "search around B's effective_from should include Profile B",
    !!foundBInFuture,
  );

  TestValidator.predicate(
    "pagination records must be at least number of returned items (B window)",
    futurePage.pagination.records >= futureSummaries.length,
  );
}

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
 * Validate searching policy setting profiles using basic filters.
 *
 * Business flow:
 *
 * 1. Join as a platform admin (POST /auth/platformAdmin/join) to obtain an
 *    authorized admin session.
 * 2. Seed multiple policy setting profiles via POST
 *    /shoppingMall/platformAdmin/policySettings with distinct categories and
 *    active flags (e.g., active cancellation, inactive cancellation, active
 *    refund).
 * 3. Invoke PATCH /shoppingMall/platformAdmin/policySettings (index) with
 *    IShoppingMallPolicySetting.IRequest filters: categories =
 *    ["cancellation"], active = true, page/pageSize and sorted by code
 *    ascending.
 * 4. Assert that the returned page (IPageIShoppingMallPolicySetting.ISummary) has
 *    consistent pagination metadata and that all returned summaries are active
 *    cancellation policies only.
 * 5. Ensure the expected seeded codes/names for active cancellation policies are
 *    present and that refund or inactive profiles are excluded.
 */
export async function test_api_platform_admin_policy_settings_search_basic_filters(
  connection: api.IConnection,
) {
  // 1. Join as a platform admin so that subsequent calls run with admin authorization
  const joinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    // use realistic but arbitrary URLs for href/referrer
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/landing",
    ip: null,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "platform admin should be active",
    admin.isActive === true,
  );

  // 2. Seed policy setting profiles with varying categories and active flags
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const effectiveFrom = new Date(now.getTime() - oneDayMs).toISOString();
  const effectiveTo = new Date(now.getTime() + oneDayMs).toISOString();

  // Seed two active cancellation policies that should match the search
  const targetPolicies: IShoppingMallPolicySetting[] = [];

  const cancellationActive1Body = {
    code: `cancel_active_${RandomGenerator.alphaNumeric(6)}`,
    name: "Active Cancellation Policy 1",
    category: "cancellation",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    config_payload: JSON.stringify({ type: "cancellation", windowHours: 24 }),
    active: true,
    effective_from: effectiveFrom,
    effective_to: effectiveTo,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const cancellationActive1 =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      {
        body: cancellationActive1Body,
      },
    );
  typia.assert(cancellationActive1);
  targetPolicies.push(cancellationActive1);

  const cancellationActive2Body = {
    code: `cancel_active_${RandomGenerator.alphaNumeric(6)}`,
    name: "Active Cancellation Policy 2",
    category: "cancellation",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    config_payload: JSON.stringify({ type: "cancellation", windowHours: 48 }),
    active: true,
    effective_from: effectiveFrom,
    effective_to: effectiveTo,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const cancellationActive2 =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      {
        body: cancellationActive2Body,
      },
    );
  typia.assert(cancellationActive2);
  targetPolicies.push(cancellationActive2);

  // Seed a cancellation policy that is inactive (should be filtered out)
  const cancellationInactiveBody = {
    code: `cancel_inactive_${RandomGenerator.alphaNumeric(6)}`,
    name: "Inactive Cancellation Policy",
    category: "cancellation",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    config_payload: JSON.stringify({ type: "cancellation", windowHours: 72 }),
    active: false,
    effective_from: effectiveFrom,
    effective_to: effectiveTo,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const cancellationInactive =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      {
        body: cancellationInactiveBody,
      },
    );
  typia.assert(cancellationInactive);

  // Seed a refund policy that is active but different category (should be filtered out)
  const refundActiveBody = {
    code: `refund_active_${RandomGenerator.alphaNumeric(6)}`,
    name: "Active Refund Policy",
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    config_payload: JSON.stringify({ type: "refund", maxRate: 0.8 }),
    active: true,
    effective_from: effectiveFrom,
    effective_to: effectiveTo,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const refundActive =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      {
        body: refundActiveBody,
      },
    );
  typia.assert(refundActive);

  // 3. Call PATCH /shoppingMall/platformAdmin/policySettings with basic filters
  const requestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    categories: ["cancellation"],
    active: true,
    orderBy: "code" as const,
    orderDirection: "asc" as const,
  } satisfies IShoppingMallPolicySetting.IRequest;

  const page: IPageIShoppingMallPolicySetting.ISummary =
    await api.functional.shoppingMall.platformAdmin.policySettings.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(page);

  const pagination = page.pagination;
  const summaries = page.data;

  // 4. Validate pagination metadata is consistent with returned data
  TestValidator.predicate(
    "pagination limit should be >= number of returned records",
    pagination.limit >= summaries.length,
  );
  TestValidator.predicate(
    "total records should be >= number of returned records",
    pagination.records >= summaries.length,
  );

  // 5. Ensure all returned profiles match filters (category=cancellation & active=true)
  await TestValidator.predicate(
    "all results must be active cancellation policies",
    async () => {
      return summaries.every(
        (s) => s.category === "cancellation" && s.active === true,
      );
    },
  );

  // 6. Ensure seeded active cancellation profiles are present in the results
  const expectedCodes = targetPolicies.map((p) => p.code);
  const resultCodes = summaries.map((s) => s.code);

  for (const code of expectedCodes) {
    TestValidator.predicate(
      `result set should contain active cancellation policy code: ${code}`,
      resultCodes.includes(code),
    );
  }

  // 7. Ensure refund or inactive policies are not present in the result set
  const excludedCodes = [cancellationInactive.code, refundActive.code];
  for (const code of excludedCodes) {
    TestValidator.predicate(
      `result set should NOT contain non-matching policy code: ${code}`,
      resultCodes.includes(code) === false,
    );
  }
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundPolicy";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";
import type { IShoppingMallRefundPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundPolicy";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";

/**
 * Validate that refund policy search returns summaries with correct region and
 * policy setting associations.
 *
 * Business flow:
 *
 * 1. Join as a platform admin to obtain an authorized session.
 * 2. Create a policy setting profile in the "refund" category and keep its
 *    business code.
 * 3. Create two region settings with distinct region codes.
 * 4. Create two refund policies:
 *
 *    - R1: scoped to regionA and linked to the created policy setting code.
 *    - R2: another policy with no explicit region/policy setting association
 *         (contrast).
 * 5. Call the refundPolicies.index search endpoint with a basic search request.
 * 6. Verify that R1 appears in the results and that its embedded regionSetting and
 *    policySetting summaries reflect the region and policy setting used at
 *    creation time.
 * 7. Verify that at least one non-R1 policy exists in the results, ensuring we are
 *    validating association data in a mixed result set.
 */
export async function test_api_refund_policy_search_with_region_and_policy_setting_filters(
  connection: api.IConnection,
) {
  // 1. Join as platform admin (auth header side-effect)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(1),
    password: RandomGenerator.alphaNumeric(12),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a refund policy setting profile
  const policySettingCode = `refund_setting_${RandomGenerator.alphaNumeric(8)}`;
  const policySettingBody = {
    code: policySettingCode,
    name: `Refund Setting ${RandomGenerator.name(1)}`,
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: true,
    effective_from: null,
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      {
        body: policySettingBody,
      },
    );
  typia.assert(policySetting);

  // 3. Create two region settings
  const regionABody = {
    code: `REGION_A_${RandomGenerator.alphaNumeric(6)}`,
    name: `Region A ${RandomGenerator.name(1)}`,
    iso_country_code: null,
    currency_code: null,
    timezone: null,
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;
  const regionBBody = {
    code: `REGION_B_${RandomGenerator.alphaNumeric(6)}`,
    name: `Region B ${RandomGenerator.name(1)}`,
    iso_country_code: null,
    currency_code: null,
    timezone: null,
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const regionA: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionABody },
    );
  typia.assert(regionA);

  const regionB: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionBBody },
    );
  typia.assert(regionB);

  // 4. Create two refund policies
  const baseRefundName = `Refund Policy ${RandomGenerator.name(1)}`;
  const refundPolicyR1Body = {
    code: `REFUND_R1_${RandomGenerator.alphaNumeric(8)}`,
    name: `${baseRefundName} R1`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 30 as number & tags.Type<"int32"> & tags.Minimum<0>,
    maxRefundRate: 1.0,
    requireManualApprovalOverAmount: 100000,
    configurationPayload: RandomGenerator.content({ paragraphs: 1 }),
    isActive: true,
    effectiveFrom: new Date().toISOString(),
    effectiveUntil: null,
    regionCode: regionA.code,
    policySettingCode: policySetting.code,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicyR2Body = {
    code: `REFUND_R2_${RandomGenerator.alphaNumeric(8)}`,
    name: `${baseRefundName} R2`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 14 as number & tags.Type<"int32"> & tags.Minimum<0>,
    maxRefundRate: 0.5,
    requireManualApprovalOverAmount: undefined,
    configurationPayload: RandomGenerator.content({ paragraphs: 1 }),
    isActive: true,
    effectiveFrom: new Date().toISOString(),
    effectiveUntil: null,
    regionCode: undefined,
    policySettingCode: undefined,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicyR1: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundPolicyR1Body },
    );
  typia.assert(refundPolicyR1);

  const refundPolicyR2: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundPolicyR2Body },
    );
  typia.assert(refundPolicyR2);

  // 5. Search refund policies via index endpoint
  const searchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    search: baseRefundName,
    codes: undefined,
    name: undefined,
    isActive: true,
    effectiveFromGte: undefined,
    effectiveFromLte: undefined,
    effectiveUntilGte: undefined,
    effectiveUntilLte: undefined,
    orderBy: "createdAt" as const,
    orderDirection: "desc" as const,
  } satisfies IShoppingMallRefundPolicy.IRequest;

  const page: IPageIShoppingMallRefundPolicy.ISummary =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.index(
      connection,
      { body: searchBody },
    );
  typia.assert(page);

  // 6. Basic pagination sanity checks
  TestValidator.predicate(
    "pagination has at least one record",
    page.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    page.pagination.limit >= 1,
  );

  // 7. Find R1 summary and verify region/policy associations
  const r1Summary = page.data.find((item) => item.code === refundPolicyR1.code);
  typia.assertGuard(r1Summary!);

  TestValidator.predicate(
    "R1 summary has regionSetting populated",
    r1Summary.regionSetting !== undefined,
  );
  TestValidator.equals(
    "R1 summary regionSetting.code matches regionA.code",
    r1Summary.regionSetting!.code,
    regionA.code,
  );

  TestValidator.predicate(
    "R1 summary has policySetting populated",
    r1Summary.policySetting !== undefined,
  );
  TestValidator.equals(
    "R1 summary policySetting.code matches policySetting.code",
    r1Summary.policySetting!.code,
    policySetting.code,
  );

  // 8. Ensure at least one non-R1 policy exists in the result set
  const hasNonR1 = page.data.some((item) => item.code !== refundPolicyR1.code);
  TestValidator.predicate(
    "search result includes at least one non-R1 policy (e.g., R2)",
    hasNonR1,
  );
}

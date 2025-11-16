import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAgeRestrictionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAgeRestrictionPolicy";
import type { IShoppingMallAgeRestrictionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAgeRestrictionPolicy";
import type { IShoppingMallCancellationPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationPolicy";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";
import type { IShoppingMallRefundPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundPolicy";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";

export async function test_api_platform_admin_search_age_restriction_policies_basic_filters(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin and obtain an authorized session
  const adminJoinRequest = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "platform admin is active after join",
    admin.isActive === true,
  );

  // 2. Create a policy setting profile that age restriction policies can link to
  const policySettingCodePrefix = "age_restriction_profile_";
  const policySettingCode = `${policySettingCodePrefix}${RandomGenerator.alphaNumeric(6)}`;

  const policySettingCreateBody = {
    code: policySettingCode,
    name: "Age Restriction Shared Profile",
    category: "age_restriction",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: true,
    effective_from: null,
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policySettingCreateBody },
    );
  typia.assert(policySetting);
  TestValidator.equals(
    "created policy setting code matches",
    policySetting.code,
    policySettingCode,
  );

  // 3. Create a region setting for region-scoped age restriction policies
  const regionCodePrefix = "REGION_";
  const regionCode = `${regionCodePrefix}${RandomGenerator.alphaNumeric(4)}`;

  const regionCreateBody = {
    code: regionCode,
    name: "Test Region for Age Restriction",
    iso_country_code: "KR",
    currency_code: "KRW",
    timezone: "Asia/Seoul",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionCreateBody },
    );
  typia.assert(region);
  TestValidator.equals("created region code matches", region.code, regionCode);

  // 4. Create complementary cancellation and refund policies for realism
  const cancellationPolicyCode = `CANCEL_${RandomGenerator.alphaNumeric(6)}`;
  const cancellationPolicyCreateBody = {
    code: cancellationPolicyCode,
    name: "Default Cancellation Policy for Age Tests",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 48,
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    effective_from: null,
    effective_to: null,
    active: true,
    region_code: regionCode,
    policy_setting_code: policySettingCode,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: cancellationPolicyCreateBody },
    );
  typia.assert(cancellationPolicy);

  const refundPolicyCode = `REFUND_${RandomGenerator.alphaNumeric(6)}`;
  const refundPolicyCreateBody = {
    code: refundPolicyCode,
    name: "Default Refund Policy for Age Tests",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 30 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    maxRefundRate: 1.0,
    requireManualApprovalOverAmount: 100000,
    configurationPayload: RandomGenerator.content({ paragraphs: 1 }),
    isActive: true,
    effectiveFrom: null,
    effectiveUntil: null,
    regionCode,
    policySettingCode,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundPolicyCreateBody },
    );
  typia.assert(refundPolicy);

  // 5. Seed multiple age restriction policies with varying attributes
  const agePolicyCodePrefix = "AGE_TEST_";

  type SeedPolicyConfig = {
    suffix: string;
    minimumAge?: number;
    requireVerifiedAge: boolean;
    active: boolean;
    linkRegionAndProfile: boolean;
  };

  const seedConfigs: SeedPolicyConfig[] = [
    {
      suffix: "A",
      minimumAge: 18,
      requireVerifiedAge: true,
      active: true,
      linkRegionAndProfile: true,
    },
    {
      suffix: "B",
      minimumAge: 21,
      requireVerifiedAge: true,
      active: true,
      linkRegionAndProfile: false,
    },
    {
      suffix: "C",
      minimumAge: 16,
      requireVerifiedAge: false,
      active: true,
      linkRegionAndProfile: true,
    },
    {
      suffix: "D",
      minimumAge: 25,
      requireVerifiedAge: true,
      active: false,
      linkRegionAndProfile: true,
    },
  ];

  const createdAgePolicies: IShoppingMallAgeRestrictionPolicy[] =
    await ArrayUtil.asyncMap(seedConfigs, async (cfg, index) => {
      const code = `${agePolicyCodePrefix}${cfg.suffix}`;
      const body = {
        code,
        name: `Age Policy ${cfg.suffix}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        minimum_age_years: cfg.minimumAge,
        require_verified_age: cfg.requireVerifiedAge,
        config_payload: RandomGenerator.content({ paragraphs: 1 }),
        active: cfg.active,
        effective_from: null,
        effective_to: null,
        region_setting_id: cfg.linkRegionAndProfile ? region.id : null,
        policy_setting_id: cfg.linkRegionAndProfile ? policySetting.id : null,
      } satisfies IShoppingMallAgeRestrictionPolicy.ICreate;

      const created =
        await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.create(
          connection,
          { body },
        );
      typia.assert(created);

      TestValidator.equals(
        `created age policy code matches for seed index ${index}`,
        created.code,
        code,
      );
      return created;
    });

  // 6. Search age restriction policies with filters
  const filterMinimumAgeFrom = 18 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const filterMinimumAgeTo = 22 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<0>;

  const requestBody = {
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    code: agePolicyCodePrefix,
    isActive: true,
    minimumAgeFrom: filterMinimumAgeFrom,
    minimumAgeTo: filterMinimumAgeTo,
    requireVerifiedAge: true,
    orderBy: "createdAt" as const,
    orderDirection: "desc" as const,
  } satisfies IShoppingMallAgeRestrictionPolicy.IRequest;

  const pageResult: IPageIShoppingMallAgeRestrictionPolicy.ISummary =
    await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.index(
      connection,
      { body: requestBody },
    );
  typia.assert(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  const data: IShoppingMallAgeRestrictionPolicy.ISummary[] = pageResult.data;

  // 7. Validate that results match filter conditions
  const expectedMatches = createdAgePolicies.filter((p) => {
    const matchesCode = p.code.startsWith(agePolicyCodePrefix);
    const matchesActive = p.active === true;
    const matchesRequireVerified = p.require_verified_age === true;
    const minAge = p.minimum_age_years;
    const matchesAgeRange =
      minAge !== undefined &&
      minAge >= filterMinimumAgeFrom &&
      minAge <= filterMinimumAgeTo;
    return (
      matchesCode && matchesActive && matchesRequireVerified && matchesAgeRange
    );
  });

  TestValidator.equals(
    "pagination.records equals number of matching seeded policies",
    pagination.records,
    expectedMatches.length,
  );

  TestValidator.predicate(
    "pagination.current is zero-based index 0 when requesting first page",
    pagination.current === 0,
  );

  TestValidator.equals(
    "pagination.limit equals requested limit",
    pagination.limit,
    requestBody.limit,
  );

  const expectedPages =
    expectedMatches.length === 0
      ? 0
      : Math.ceil(expectedMatches.length / requestBody.limit);
  TestValidator.equals(
    "pagination.pages computed from records and limit",
    pagination.pages,
    expectedPages,
  );

  TestValidator.equals(
    "number of returned items not exceeding limit and consistent with records",
    data.length,
    Math.min(expectedMatches.length, requestBody.limit),
  );

  await ArrayUtil.asyncForEach(data, async (summary, index) => {
    typia.assert(summary);

    TestValidator.predicate(
      `summary ${index} code starts with prefix`,
      summary.code.startsWith(agePolicyCodePrefix),
    );

    TestValidator.equals(
      `summary ${index} active flag is true`,
      summary.active,
      true,
    );

    TestValidator.equals(
      `summary ${index} require_verified_age is true`,
      summary.require_verified_age,
      true,
    );

    const minAge = summary.minimumAge;
    if (minAge !== null && minAge !== undefined) {
      TestValidator.predicate(
        `summary ${index} minimumAge within requested range`,
        minAge >= filterMinimumAgeFrom && minAge <= filterMinimumAgeTo,
      );
    }
  });

  // 8. Validate sort order by created_at desc when there are multiple results
  if (data.length > 1) {
    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1];
      const curr = data[i];
      const prevCreated = new Date(prev.created_at).getTime();
      const currCreated = new Date(curr.created_at).getTime();

      TestValidator.predicate(
        `created_at of item ${i - 1} is >= created_at of item ${i}`,
        prevCreated >= currCreated,
      );
    }
  }
}

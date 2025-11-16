import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";
import type { IShoppingMallRefundPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundPolicy";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";

/**
 * Validate that a platform administrator can view detailed refund policy
 * configuration by business code.
 *
 * Business context:
 *
 * - Platform admins manage global refund behavior through refund policies that
 *   can be scoped by region and can reuse shared policy setting profiles.
 * - Admins expect that once a refund policy is created with a business code,
 *   looking it up by that code returns a full, consistent view of the
 *   configuration including associations and lifecycle metadata.
 *
 * Steps validated by this E2E test:
 *
 * 1. Register (join) a new platform administrator and obtain an authorized
 *    session.
 * 2. As that admin, create a region setting with a unique business code.
 * 3. Create a policy setting profile with category "refund" and a unique business
 *    code.
 * 4. Create a refund policy that:
 *
 *    - Uses its own unique business code.
 *    - Enables both full and partial refunds.
 *    - Configures a finite refund window and maximum refund rate.
 *    - References the previously created region and policy setting by their codes.
 *    - Is marked active with a reasonable effectiveFrom/effectiveUntil window.
 * 5. Fetch the refund policy by its business code using the detail-view endpoint.
 * 6. Assert that the fetched refund policy matches the created configuration
 *    across key business fields, including regionCode and policySettingCode,
 *    and that audit timestamps are present and consistent (updatedAt >=
 *    createdAt).
 */
export async function test_api_refund_policy_detail_view_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator and establish authenticated context.
  const joinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a region setting to be referenced by the refund policy.
  const regionCode = `REGION_${RandomGenerator.alphaNumeric(8)}`;
  const regionBody = {
    code: regionCode,
    name: "Korea Market",
    iso_country_code: "KR",
    currency_code: "KRW",
    timezone: "Asia/Seoul",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionBody },
    );
  typia.assert(region);

  TestValidator.equals(
    "region code must match request payload",
    region.code,
    regionCode,
  );

  // 3. Create a policy setting profile with category "refund".
  const policySettingCode = `REFUND_PROFILE_${RandomGenerator.alphaNumeric(8)}`;
  const now = new Date();
  const nowIso = now.toISOString();
  const laterIso = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const policySettingBody = {
    code: policySettingCode,
    name: "Default Refund Policy Profile",
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    config_payload: JSON.stringify({
      escalationLevel: "standard",
      notifyFinance: true,
    }),
    active: true,
    effective_from: nowIso,
    effective_to: laterIso,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policySettingBody },
    );
  typia.assert(policySetting);

  TestValidator.equals(
    "policy setting code must match request payload",
    policySetting.code,
    policySettingCode,
  );

  // 4. Create a refund policy that references the region and policy setting.
  const refundPolicyCode = `default_refund_${RandomGenerator.alphaNumeric(8)}`;

  const refundWindowDays: number & tags.Type<"int32"> & tags.Minimum<0> =
    typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>();

  const maxRefundRate = 0.8;
  const requireManualApprovalOverAmount = 50000;

  const refundPolicyCreateBody = {
    code: refundPolicyCode,
    name: "Default Refund Policy for Korea",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays,
    maxRefundRate,
    requireManualApprovalOverAmount,
    configurationPayload: JSON.stringify({
      anchorEvent: "delivery",
      sameDayGraceHours: 6,
    }),
    isActive: true,
    effectiveFrom: nowIso,
    effectiveUntil: laterIso,
    regionCode: region.code,
    policySettingCode: policySetting.code,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const createdPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundPolicyCreateBody },
    );
  typia.assert(createdPolicy);

  // Basic field equality checks between request and created entity.
  TestValidator.equals(
    "refund policy code must match request payload",
    createdPolicy.code,
    refundPolicyCode,
  );
  TestValidator.equals(
    "refund policy name must match request payload",
    createdPolicy.name,
    refundPolicyCreateBody.name,
  );
  TestValidator.equals(
    "refund policy isActive flag must match request payload",
    createdPolicy.isActive,
    refundPolicyCreateBody.isActive,
  );
  TestValidator.equals(
    "allowFullRefund flag must match request payload",
    createdPolicy.allowFullRefund,
    refundPolicyCreateBody.allowFullRefund,
  );
  TestValidator.equals(
    "allowPartialRefund flag must match request payload",
    createdPolicy.allowPartialRefund,
    refundPolicyCreateBody.allowPartialRefund,
  );
  if (createdPolicy.maxRefundRate !== undefined) {
    TestValidator.equals(
      "maxRefundRate must match request payload when present",
      createdPolicy.maxRefundRate,
      maxRefundRate,
    );
  }
  if (createdPolicy.regionCode !== undefined) {
    TestValidator.equals(
      "regionCode must match referenced region code",
      createdPolicy.regionCode,
      region.code,
    );
  }
  if (createdPolicy.policySettingCode !== undefined) {
    TestValidator.equals(
      "policySettingCode must match referenced policy setting code",
      createdPolicy.policySettingCode,
      policySetting.code,
    );
  }

  // Audit timestamps should be valid and ordered.
  const createdAtDate = new Date(createdPolicy.createdAt).getTime();
  const updatedAtDate = new Date(createdPolicy.updatedAt).getTime();

  TestValidator.predicate(
    "createdAt timestamp must be a valid date",
    !Number.isNaN(createdAtDate),
  );
  TestValidator.predicate(
    "updatedAt timestamp must be a valid date",
    !Number.isNaN(updatedAtDate),
  );
  TestValidator.predicate(
    "updatedAt must be greater than or equal to createdAt",
    updatedAtDate >= createdAtDate,
  );

  // 5. Retrieve the refund policy by its business code.
  const fetchedPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.at(
      connection,
      { refundPolicyCode: createdPolicy.code },
    );
  typia.assert(fetchedPolicy);

  // 6. Validate that fetched policy matches created configuration.
  TestValidator.equals(
    "fetched policy id must match created policy id",
    fetchedPolicy.id,
    createdPolicy.id,
  );
  TestValidator.equals(
    "fetched policy code must match",
    fetchedPolicy.code,
    createdPolicy.code,
  );
  TestValidator.equals(
    "fetched policy name must match",
    fetchedPolicy.name,
    createdPolicy.name,
  );
  TestValidator.equals(
    "fetched isActive must match",
    fetchedPolicy.isActive,
    createdPolicy.isActive,
  );
  TestValidator.equals(
    "fetched allowFullRefund must match",
    fetchedPolicy.allowFullRefund,
    createdPolicy.allowFullRefund,
  );
  TestValidator.equals(
    "fetched allowPartialRefund must match",
    fetchedPolicy.allowPartialRefund,
    createdPolicy.allowPartialRefund,
  );

  if (createdPolicy.maxRefundRate !== undefined) {
    TestValidator.equals(
      "fetched maxRefundRate must match created",
      fetchedPolicy.maxRefundRate,
      createdPolicy.maxRefundRate,
    );
  }

  if (createdPolicy.regionCode !== undefined) {
    TestValidator.equals(
      "fetched regionCode must match created",
      fetchedPolicy.regionCode,
      createdPolicy.regionCode,
    );
  }

  if (createdPolicy.policySettingCode !== undefined) {
    TestValidator.equals(
      "fetched policySettingCode must match created",
      fetchedPolicy.policySettingCode,
      createdPolicy.policySettingCode,
    );
  }

  if (createdPolicy.effectiveFrom !== undefined) {
    TestValidator.equals(
      "fetched effectiveFrom must match created",
      fetchedPolicy.effectiveFrom,
      createdPolicy.effectiveFrom,
    );
  }

  if (createdPolicy.effectiveUntil !== undefined) {
    TestValidator.equals(
      "fetched effectiveUntil must match created",
      fetchedPolicy.effectiveUntil,
      createdPolicy.effectiveUntil,
    );
  }

  const fetchedCreatedAtDate = new Date(fetchedPolicy.createdAt).getTime();
  const fetchedUpdatedAtDate = new Date(fetchedPolicy.updatedAt).getTime();

  TestValidator.predicate(
    "fetched createdAt must equal created createdAt",
    fetchedCreatedAtDate === createdAtDate,
  );
  TestValidator.predicate(
    "fetched updatedAt must be >= created updatedAt",
    fetchedUpdatedAtDate >= updatedAtDate,
  );
}

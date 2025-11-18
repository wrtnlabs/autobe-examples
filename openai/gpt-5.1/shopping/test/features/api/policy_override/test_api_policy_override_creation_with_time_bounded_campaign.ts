import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";
import type { IShoppingMallPolicyOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyOverride";
import type { IShoppingMallPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyVersion";

export async function test_api_policy_override_creation_with_time_bounded_campaign(
  connection: api.IConnection,
) {
  // 1. Admin joins and gets authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/login",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Create base business policy for the campaign
  const policyCode = `campaign_refund_relaxation_${RandomGenerator.alphaNumeric(8)}`;
  const policyCreateBody = {
    policy_code: policyCode,
    name: "Refund Relaxation Campaign Policy",
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const businessPolicy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: policyCreateBody,
      },
    );
  typia.assert<IShoppingMallBusinessPolicy>(businessPolicy);

  TestValidator.equals(
    "business policy code should match request",
    businessPolicy.policy_code,
    policyCreateBody.policy_code,
  );
  TestValidator.predicate(
    "business policy should be active",
    businessPolicy.is_active === true,
  );

  // 3. Create active policy version representing the campaign
  const now = new Date();
  const campaignStartDate = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour in future
  const campaignEndDate = new Date(
    campaignStartDate.getTime() + 7 * 24 * 60 * 60 * 1000,
  ); // +7 days

  const campaignEffectiveFrom = campaignStartDate.toISOString();
  const campaignEffectiveUntil = campaignEndDate.toISOString();

  const parametersObject = {
    refund_window_days: 45,
    campaign_name: "Spring Refund Relaxation",
  } as const;
  const parametersJson = JSON.stringify(parametersObject);

  const policyVersionCreateBody = {
    version_code: "campaign_spring_2025",
    title: "Spring 2025 Refund Relaxation Version",
    body_markdown: RandomGenerator.content({ paragraphs: 3 }),
    parameters_json: parametersJson,
    status: "active",
    effective_from: campaignEffectiveFrom,
    effective_until: campaignEffectiveUntil,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const policyVersion: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode: businessPolicy.policy_code,
        body: policyVersionCreateBody,
      },
    );
  typia.assert<IShoppingMallPolicyVersion>(policyVersion);

  TestValidator.equals(
    "policy version should be active",
    policyVersion.status,
    policyVersionCreateBody.status,
  );
  TestValidator.equals(
    "policy version effective_from should match request",
    policyVersion.effective_from ?? null,
    policyVersionCreateBody.effective_from ?? null,
  );
  TestValidator.equals(
    "policy version effective_until should match request",
    policyVersion.effective_until ?? null,
    policyVersionCreateBody.effective_until ?? null,
  );

  // 4. Create time-bounded policy override for the campaign
  const overrideEffectiveFrom = campaignEffectiveFrom;
  const overrideEffectiveUntil = campaignEffectiveUntil;

  const overrideCreateBody = {
    shopping_mall_policy_version_id: policyVersion.id,
    subject_type: "global",
    subject_id: null,
    subject_display: "Spring 2025 Refund Relaxation Campaign",
    override_code: "max_refund_window_days",
    override_value: "45",
    reason: "Relax refund window during Spring 2025 campaign period",
    status: "active",
    effective_from: overrideEffectiveFrom,
    effective_until: overrideEffectiveUntil,
  } satisfies IShoppingMallPolicyOverride.ICreate;

  const createdOverride: IShoppingMallPolicyOverride =
    await api.functional.shoppingMall.admin.policyOverrides.create(connection, {
      body: overrideCreateBody,
    });
  typia.assert<IShoppingMallPolicyOverride>(createdOverride);

  // 5. Validate created override core fields
  TestValidator.equals(
    "override should reference the correct policy version",
    createdOverride.shopping_mall_policy_version_id,
    overrideCreateBody.shopping_mall_policy_version_id,
  );

  TestValidator.equals(
    "override status should remain active",
    createdOverride.status,
    overrideCreateBody.status,
  );

  TestValidator.equals(
    "override subject_type should match request",
    createdOverride.subject_type,
    overrideCreateBody.subject_type,
  );

  TestValidator.equals(
    "override subject_display should match request",
    createdOverride.subject_display ?? null,
    overrideCreateBody.subject_display ?? null,
  );

  TestValidator.equals(
    "override override_code should match request",
    createdOverride.override_code,
    overrideCreateBody.override_code,
  );

  TestValidator.equals(
    "override override_value should match request",
    createdOverride.override_value,
    overrideCreateBody.override_value,
  );

  TestValidator.equals(
    "override effective_from should match requested campaign start",
    createdOverride.effective_from ?? null,
    overrideCreateBody.effective_from ?? null,
  );

  TestValidator.equals(
    "override effective_until should match requested campaign end",
    createdOverride.effective_until ?? null,
    overrideCreateBody.effective_until ?? null,
  );

  TestValidator.equals(
    "override deleted_at should be null on creation",
    createdOverride.deleted_at ?? null,
    null,
  );

  if (createdOverride.policyVersion) {
    TestValidator.equals(
      "override.policyVersion.id should match base policyVersion.id",
      createdOverride.policyVersion.id,
      policyVersion.id,
    );
    TestValidator.equals(
      "override.policyVersion.status should be active",
      createdOverride.policyVersion.status,
      policyVersion.status,
    );
  }
}

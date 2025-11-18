import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
import type { IShoppingMallPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyVersion";

export async function test_api_case_sla_config_detail_by_admin_with_policy_version(
  connection: api.IConnection,
) {
  // 1. Admin joins and obtains authorized context (token handled automatically by SDK)
  const adminJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@admin.example.com`,
    password: "AdminPassword123!", // satisfies password format semantics
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a logical business policy
  const policyCode = `refund_policy_${RandomGenerator.alphaNumeric(8)}`;

  const businessPolicyBody = {
    policy_code: policyCode,
    name: "Refund SLA Policy",
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const businessPolicy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: businessPolicyBody,
      },
    );
  typia.assert<IShoppingMallBusinessPolicy>(businessPolicy);

  // 3. Create an active policy version
  const nowIso = new Date().toISOString();

  const policyVersionBody = {
    version_code: "v1",
    title: "Refund SLA v1",
    body_markdown: RandomGenerator.content({ paragraphs: 2 }),
    parameters_json: null,
    status: "active",
    effective_from: nowIso,
    effective_until: null,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const policyVersion: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode,
        body: policyVersionBody,
      },
    );
  typia.assert<IShoppingMallPolicyVersion>(policyVersion);

  // 4. Create a case SLA configuration linked to the created policy version
  const targetDuration = 4 * 60 * 60; // 4 hours in seconds
  const warningDuration = 2 * 60 * 60; // 2 hours in seconds

  const caseSlaCreateBody = {
    shopping_mall_business_policy_version_id: policyVersion.id,
    case_type: "refund",
    actor_role: "seller",
    action_type: "initial_response",
    target_duration_seconds: targetDuration,
    warning_duration_seconds: warningDuration,
    is_active: true,
  } satisfies IShoppingMallCaseSlaConfig.ICreate;

  const createdCaseSla: IShoppingMallCaseSlaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.create(connection, {
      body: caseSlaCreateBody,
    });
  typia.assert<IShoppingMallCaseSlaConfig>(createdCaseSla);

  // 5. Retrieve the detail using GET /shoppingMall/admin/caseSlaConfigs/{caseSlaConfigId}
  const detail: IShoppingMallCaseSlaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.at(connection, {
      caseSlaConfigId: createdCaseSla.id as string & tags.Format<"uuid">,
    });
  typia.assert<IShoppingMallCaseSlaConfig>(detail);

  // 6. Validate key fields are preserved
  TestValidator.equals(
    "detail id should match created SLA id",
    detail.id,
    createdCaseSla.id,
  );

  TestValidator.equals(
    "case_type should be preserved",
    detail.case_type,
    createdCaseSla.case_type,
  );
  TestValidator.equals(
    "actor_role should be preserved",
    detail.actor_role,
    createdCaseSla.actor_role,
  );
  TestValidator.equals(
    "action_type should be preserved",
    detail.action_type,
    createdCaseSla.action_type,
  );
  TestValidator.equals(
    "target_duration_seconds should be preserved",
    detail.target_duration_seconds,
    createdCaseSla.target_duration_seconds,
  );
  TestValidator.equals(
    "warning_duration_seconds should be preserved",
    detail.warning_duration_seconds,
    createdCaseSla.warning_duration_seconds,
  );
  TestValidator.equals(
    "is_active should be preserved",
    detail.is_active,
    createdCaseSla.is_active,
  );

  // Validate policyVersion linkage
  TestValidator.predicate(
    "policyVersion should be non-null in detail",
    detail.policyVersion !== null && detail.policyVersion !== undefined,
  );

  if (detail.policyVersion !== null && detail.policyVersion !== undefined) {
    TestValidator.equals(
      "policyVersion id should match created version id",
      detail.policyVersion.id,
      policyVersion.id,
    );

    if (detail.policyVersion.policy !== undefined) {
      TestValidator.equals(
        "policyVersion.policy.code should match business policy policy_code",
        detail.policyVersion.policy.code,
        businessPolicy.policy_code,
      );
    }
  }

  // 7. Repeat GET to ensure idempotent, stable data
  const detailAgain: IShoppingMallCaseSlaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.at(connection, {
      caseSlaConfigId: createdCaseSla.id as string & tags.Format<"uuid">,
    });
  typia.assert<IShoppingMallCaseSlaConfig>(detailAgain);

  TestValidator.equals(
    "re-fetched detail should equal first fetched detail",
    detailAgain,
    detail,
  );
}

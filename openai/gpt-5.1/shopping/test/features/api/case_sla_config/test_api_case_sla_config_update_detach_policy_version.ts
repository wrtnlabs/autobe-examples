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

/**
 * Verify that an admin can detach a policy version from a case SLA
 * configuration.
 *
 * ## Business context
 *
 * Case SLA configs (IShoppingMallCaseSlaConfig) can optionally be associated
 * with a specific business policy version via the
 * shopping_mall_business_policy_version_id foreign key (surfaced as the
 * nullable policyVersion summary association in the read model). Governance
 * rules may allow an admin to later detach that SLA rule from any concrete
 * policy text while preserving the SLA timings and activation flags
 * themselves.
 *
 * This test exercises the happy-path workflow for such a detachment using the
 * admin-only APIs:
 *
 * 1. Join as an admin to obtain authenticated context.
 * 2. Create a business policy using POST /shoppingMall/admin/businessPolicies.
 * 3. Create an active policy version for that policy using POST
 *    /shoppingMall/admin/businessPolicies/{policyCode}/versions.
 * 4. Create a case SLA configuration via POST /shoppingMall/admin/caseSlaConfigs
 *    that references the created policy version id in
 *    shopping_mall_business_policy_version_id and is marked active.
 * 5. Call PUT /shoppingMall/admin/caseSlaConfigs/{caseSlaConfigId} with a body
 *    that only sets shopping_mall_business_policy_version_id to null and does
 *    not touch other fields.
 * 6. Assert that the update succeeded, the returned SLA config still matches the
 *    original for case_type, actor_role, action_type, target_duration_seconds,
 *    warning_duration_seconds, and is_active, and that policyVersion is now
 *    null, confirming successful detachment.
 */
export async function test_api_case_sla_config_update_detach_policy_version(
  connection: api.IConnection,
) {
  // 1. Join as admin to get authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.shoppingmall.test/join" as string & tags.Format<"uri">,
    referrer: "https://shoppingmall.test/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a business policy
  const policyCode: string = `case_sla_${RandomGenerator.alphaNumeric(8)}`;
  const policyCreateBody = {
    policy_code: policyCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    category: "case_sla",
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
  typia.assert(businessPolicy);
  TestValidator.equals(
    "created policy uses requested policy_code",
    businessPolicy.policy_code,
    policyCode,
  );

  // 3. Create a policy version under that policy
  const policyVersionCreateBody = {
    version_code: "v1",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body_markdown: RandomGenerator.content({ paragraphs: 2 }),
    parameters_json: null,
    status: "active",
    effective_from: null,
    effective_until: null,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const policyVersion: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode,
        body: policyVersionCreateBody,
      },
    );
  typia.assert(policyVersion);
  TestValidator.equals(
    "policyVersion belongs to created policy code",
    policyVersion.policy.code,
    businessPolicy.policy_code,
  );

  // 4. Create a case SLA config referencing that policy version
  const caseType = "refund";
  const actorRole = "seller";
  const actionType = "initial_response";
  const slaCreateBody = {
    shopping_mall_business_policy_version_id: policyVersion.id,
    case_type: caseType,
    actor_role: actorRole,
    action_type: actionType,
    target_duration_seconds: (48 * 60 * 60) as number & tags.Type<"int32">,
    warning_duration_seconds: (24 * 60 * 60) as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallCaseSlaConfig.ICreate;

  const createdSlaConfig: IShoppingMallCaseSlaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.create(connection, {
      body: slaCreateBody,
    });
  typia.assert(createdSlaConfig);

  // Validate initial state has non-null policyVersion summary
  TestValidator.predicate(
    "created SLA config should have non-null policyVersion before detachment",
    createdSlaConfig.policyVersion !== null &&
      createdSlaConfig.policyVersion !== undefined,
  );
  if (
    createdSlaConfig.policyVersion !== null &&
    createdSlaConfig.policyVersion !== undefined
  ) {
    TestValidator.equals(
      "policyVersion.id should match version id used during creation",
      createdSlaConfig.policyVersion.id,
      policyVersion.id,
    );
  }

  // Snapshot fields that must remain unchanged across the update
  const originalCaseType = createdSlaConfig.case_type;
  const originalActorRole = createdSlaConfig.actor_role;
  const originalActionType = createdSlaConfig.action_type;
  const originalTargetDuration = createdSlaConfig.target_duration_seconds;
  const originalWarningDuration = createdSlaConfig.warning_duration_seconds;
  const originalIsActive = createdSlaConfig.is_active;

  // 5. Update: detach the policy version by setting FK to null only
  const slaUpdateBody = {
    shopping_mall_business_policy_version_id: null,
  } satisfies IShoppingMallCaseSlaConfig.IUpdate;

  const updatedSlaConfig: IShoppingMallCaseSlaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.update(connection, {
      caseSlaConfigId: createdSlaConfig.id,
      body: slaUpdateBody,
    });
  typia.assert(updatedSlaConfig);

  // 6. Assertions: business invariants and detachment result
  TestValidator.equals(
    "SLA config id is preserved after update",
    updatedSlaConfig.id,
    createdSlaConfig.id,
  );

  TestValidator.equals(
    "case_type remains unchanged after detaching policy version",
    updatedSlaConfig.case_type,
    originalCaseType,
  );
  TestValidator.equals(
    "actor_role remains unchanged after detaching policy version",
    updatedSlaConfig.actor_role,
    originalActorRole,
  );
  TestValidator.equals(
    "action_type remains unchanged after detaching policy version",
    updatedSlaConfig.action_type,
    originalActionType,
  );
  TestValidator.equals(
    "target_duration_seconds remains unchanged after detaching policy version",
    updatedSlaConfig.target_duration_seconds,
    originalTargetDuration,
  );
  TestValidator.equals(
    "warning_duration_seconds remains unchanged after detaching policy version",
    updatedSlaConfig.warning_duration_seconds,
    originalWarningDuration,
  );
  TestValidator.equals(
    "is_active flag remains unchanged after detaching policy version",
    updatedSlaConfig.is_active,
    originalIsActive,
  );

  TestValidator.equals(
    "policyVersion should be null after detaching policy version",
    updatedSlaConfig.policyVersion,
    null,
  );
}

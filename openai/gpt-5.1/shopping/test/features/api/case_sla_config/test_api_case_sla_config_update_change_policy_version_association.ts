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

export async function test_api_case_sla_config_update_change_policy_version_association(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain authorized admin context
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(admin);

  // 2. Create a business policy that will own the policy versions
  const policyCode: string = `case_sla_${RandomGenerator.alphaNumeric(8)}`;

  const policyCreateBody = {
    policy_code: policyCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    category: "case_sla",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const policy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: policyCreateBody,
      },
    );
  typia.assert(policy);

  TestValidator.equals(
    "created policy_code should match requested policyCode",
    policy.policy_code,
    policyCode,
  );

  // 3. Create first policy version (v1)
  const version1Code = "v1";
  const version1Body = {
    version_code: version1Code,
    title: `Initial SLA policy version ${version1Code}`,
    body_markdown: RandomGenerator.content({ paragraphs: 2 }),
    parameters_json: null,
    status: "active",
    effective_from: null,
    effective_until: null,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const version1: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode,
        body: version1Body,
      },
    );
  typia.assert(version1);

  TestValidator.equals(
    "first version_code should be v1",
    version1.version_code,
    version1Code,
  );

  // 4. Create second policy version (v2)
  const version2Code = "v2";
  const version2Body = {
    version_code: version2Code,
    title: `Follow-up SLA policy version ${version2Code}`,
    body_markdown: RandomGenerator.content({ paragraphs: 3 }),
    parameters_json: null,
    status: "active",
    effective_from: null,
    effective_until: null,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const version2: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode,
        body: version2Body,
      },
    );
  typia.assert(version2);

  TestValidator.equals(
    "second version_code should be v2",
    version2.version_code,
    version2Code,
  );

  // 5. Create a case SLA configuration bound to the first version
  const caseType = "refund";
  const actorRole = "seller";
  const actionType = "initial_response";
  const targetDurationSeconds = 3600 as number & tags.Type<"int32">; // 1 hour
  const warningDurationSeconds = 1800 as number & tags.Type<"int32">; // 30 minutes

  const slaCreateBody = {
    shopping_mall_business_policy_version_id: version1.id,
    case_type: caseType,
    actor_role: actorRole,
    action_type: actionType,
    target_duration_seconds: targetDurationSeconds,
    warning_duration_seconds: warningDurationSeconds,
    is_active: true,
  } satisfies IShoppingMallCaseSlaConfig.ICreate;

  const createdSla: IShoppingMallCaseSlaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.create(connection, {
      body: slaCreateBody,
    });
  typia.assert(createdSla);

  TestValidator.equals(
    "created SLA case_type should match request",
    createdSla.case_type,
    caseType,
  );
  TestValidator.equals(
    "created SLA actor_role should match request",
    createdSla.actor_role,
    actorRole,
  );
  TestValidator.equals(
    "created SLA action_type should match request",
    createdSla.action_type,
    actionType,
  );
  TestValidator.equals(
    "created SLA target_duration_seconds should match request",
    createdSla.target_duration_seconds,
    targetDurationSeconds,
  );
  TestValidator.equals(
    "created SLA warning_duration_seconds should match request",
    createdSla.warning_duration_seconds,
    warningDurationSeconds,
  );
  TestValidator.equals(
    "created SLA is_active should be true",
    createdSla.is_active,
    true,
  );

  if (
    createdSla.policyVersion !== null &&
    createdSla.policyVersion !== undefined
  ) {
    TestValidator.equals(
      "initial SLA policyVersion should reference v1",
      createdSla.policyVersion.id,
      version1.id,
    );
    TestValidator.equals(
      "initial SLA policyVersion.version_code should be v1",
      createdSla.policyVersion.version_code,
      version1Code,
    );
  }

  const originalUpdatedAt = createdSla.updated_at;

  // 6. Update SLA config to reference the second policy version only
  const updateBody = {
    shopping_mall_business_policy_version_id: version2.id,
  } satisfies IShoppingMallCaseSlaConfig.IUpdate;

  const updatedSla: IShoppingMallCaseSlaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.update(connection, {
      caseSlaConfigId: createdSla.id,
      body: updateBody,
    });
  typia.assert(updatedSla);

  // 7. Assertions to verify association switched and core fields unchanged
  TestValidator.equals(
    "updated SLA id should equal original id",
    updatedSla.id,
    createdSla.id,
  );

  TestValidator.equals(
    "updated SLA case_type remains unchanged",
    updatedSla.case_type,
    createdSla.case_type,
  );
  TestValidator.equals(
    "updated SLA actor_role remains unchanged",
    updatedSla.actor_role,
    createdSla.actor_role,
  );
  TestValidator.equals(
    "updated SLA action_type remains unchanged",
    updatedSla.action_type,
    createdSla.action_type,
  );
  TestValidator.equals(
    "updated SLA target_duration_seconds remains unchanged",
    updatedSla.target_duration_seconds,
    createdSla.target_duration_seconds,
  );
  TestValidator.equals(
    "updated SLA warning_duration_seconds remains unchanged",
    updatedSla.warning_duration_seconds,
    createdSla.warning_duration_seconds,
  );
  TestValidator.equals(
    "updated SLA is_active remains unchanged",
    updatedSla.is_active,
    createdSla.is_active,
  );

  if (
    updatedSla.policyVersion !== null &&
    updatedSla.policyVersion !== undefined
  ) {
    TestValidator.equals(
      "updated SLA policyVersion should now reference v2",
      updatedSla.policyVersion.id,
      version2.id,
    );
    TestValidator.equals(
      "updated SLA policyVersion.version_code should be v2",
      updatedSla.policyVersion.version_code,
      version2Code,
    );
  } else {
    TestValidator.predicate(
      "updated SLA policyVersion should not be null",
      false,
    );
  }

  TestValidator.predicate(
    "updated_at should be later than or equal to original updated_at",
    updatedSla.updated_at >= originalUpdatedAt,
  );
}

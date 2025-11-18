import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
import type { IShoppingMallCaseSlaViolation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaViolation";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDispute";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import type { IShoppingMallPaymentChargeback } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentChargeback";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyVersion";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate stability of case SLA violation detail responses across repeated
 * reads.
 *
 * Business intent: Even though we cannot programmatically create real SLA
 * violations or update their underlying SLA configurations with the current API
 * surface, we still want to ensure that the violation detail endpoint returns
 * internally consistent, stable data for a given violation id. This
 * approximates the "historical consistency" requirement by verifying that core
 * violation attributes and the embedded SLA configuration summary do not change
 * between successive reads for the same resource.
 *
 * Test scenario:
 *
 * 1. Join as an admin using POST /auth/admin/join to obtain an authorized
 *    administrator context. The SDK automatically wires the access token into
 *    connection.headers.Authorization.
 * 2. Create a business policy with a unique policy_code via POST
 *    /shoppingMall/admin/businessPolicies. This represents a logical governance
 *    policy for SLA rules.
 * 3. Under that policy, create a concrete policy version using POST
 *    /shoppingMall/admin/businessPolicies/{policyCode}/versions. This captures
 *    a specific rule set and provides a version id to which SLA configs can be
 *    linked.
 * 4. Create a case SLA configuration via POST /shoppingMall/admin/caseSlaConfigs
 *    that references the newly created policy version and defines a target
 *    response window (case_type, actor_role, action_type, target_duration,
 *    optional warning_duration, is_active). This exercises the config creation
 *    path and ensures DTO wiring is correct, even though it will not be linked
 *    to a specific violation in this test.
 * 5. Generate a random UUID to act as a caseSlaViolationId. In simulate mode, the
 *    SDK will synthesize a corresponding IShoppingMallCaseSlaViolation; in a
 *    seeded environment, this would refer to an existing violation record.
 * 6. Call GET /shoppingMall/admin/caseSlaViolations/{caseSlaViolationId} twice
 *    with the same id using
 *    api.functional.shoppingMall.admin.caseSlaViolations.at. Assert that both
 *    responses are valid IShoppingMallCaseSlaViolation objects using
 *    typia.assert.
 * 7. Verify that core violation fields remain identical between the two reads: id,
 *    case_type, actor_role, action_type, breach_duration_seconds, detected_at,
 *    and created_at.
 * 8. Verify that the embedded slaConfig summary is also stable between reads: id,
 *    case_type, actor_role, action_type, target_duration_seconds, and
 *    is_active. When the optional shopping_mall_business_policy_version_id is
 *    present, assert that it has a valid UUID format.
 *
 * This test does not assert any relationship between the created SLA config and
 * the randomly fetched violation, because the available APIs do not provide a
 * way to attach them. Instead, it focuses on the repeat-read consistency of the
 * violation detail endpoint and the integrity of its embedded SLA configuration
 * summary.
 */
export async function test_api_case_sla_violation_detail_consistency_after_sla_config_change(
  connection: api.IConnection,
) {
  // 1. Admin join to ensure we have an authorized admin context
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Create a business policy
  const policyBody = {
    policy_code: `sla_policy_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    category: "sla-governance",
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const policy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      { body: policyBody },
    );
  typia.assert(policy);

  // 3. Create a policy version under that policy
  const policyVersionBody = {
    version_code: `v_${RandomGenerator.alphaNumeric(6)}`,
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    body_markdown: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 6,
      sentenceMax: 12,
      wordMin: 3,
      wordMax: 8,
    }),
    parameters_json: null,
    status: "active",
    effective_from: null,
    effective_until: null,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const policyVersion: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode: policy.policy_code,
        body: policyVersionBody,
      },
    );
  typia.assert(policyVersion);

  // 4. Create a case SLA config linked to that policy version
  const slaConfigBody = {
    shopping_mall_business_policy_version_id: policyVersion.id,
    case_type: "cancellation",
    actor_role: "seller",
    action_type: "initial_response",
    target_duration_seconds: 3600 as number & tags.Type<"int32">,
    warning_duration_seconds: 1800 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallCaseSlaConfig.ICreate;

  const slaConfig: IShoppingMallCaseSlaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.create(connection, {
      body: slaConfigBody,
    });
  typia.assert(slaConfig);

  // 5. Generate a random SLA violation id (primarily for simulate mode);
  //    in a real environment this would come from a search/list endpoint.
  const caseSlaViolationId = typia.random<string & tags.Format<"uuid">>();

  // 6. Call violation detail endpoint twice with the same id
  const firstViolation: IShoppingMallCaseSlaViolation =
    await api.functional.shoppingMall.admin.caseSlaViolations.at(connection, {
      caseSlaViolationId,
    });
  typia.assert(firstViolation);

  const secondViolation: IShoppingMallCaseSlaViolation =
    await api.functional.shoppingMall.admin.caseSlaViolations.at(connection, {
      caseSlaViolationId,
    });
  typia.assert(secondViolation);

  // 7. Validate business-level consistency between the two reads
  TestValidator.equals(
    "violation id remains stable between reads",
    firstViolation.id,
    secondViolation.id,
  );

  TestValidator.equals(
    "case_type remains stable between reads",
    firstViolation.case_type,
    secondViolation.case_type,
  );

  TestValidator.equals(
    "actor_role remains stable between reads",
    firstViolation.actor_role,
    secondViolation.actor_role,
  );

  TestValidator.equals(
    "action_type remains stable between reads",
    firstViolation.action_type,
    secondViolation.action_type,
  );

  TestValidator.equals(
    "breach_duration_seconds remains stable between reads",
    firstViolation.breach_duration_seconds,
    secondViolation.breach_duration_seconds,
  );

  TestValidator.equals(
    "detected_at remains stable between reads",
    firstViolation.detected_at,
    secondViolation.detected_at,
  );

  TestValidator.equals(
    "created_at remains stable between reads",
    firstViolation.created_at,
    secondViolation.created_at,
  );

  // 8. Validate slaConfig summary consistency when present
  typia.assert(firstViolation.slaConfig);
  typia.assert(secondViolation.slaConfig);

  TestValidator.equals(
    "slaConfig id remains stable between reads",
    firstViolation.slaConfig.id,
    secondViolation.slaConfig.id,
  );

  TestValidator.equals(
    "slaConfig case_type remains stable between reads",
    firstViolation.slaConfig.case_type,
    secondViolation.slaConfig.case_type,
  );

  TestValidator.equals(
    "slaConfig actor_role remains stable between reads",
    firstViolation.slaConfig.actor_role,
    secondViolation.slaConfig.actor_role,
  );

  TestValidator.equals(
    "slaConfig action_type remains stable between reads",
    firstViolation.slaConfig.action_type,
    secondViolation.slaConfig.action_type,
  );

  TestValidator.equals(
    "slaConfig target_duration_seconds remains stable between reads",
    firstViolation.slaConfig.target_duration_seconds,
    secondViolation.slaConfig.target_duration_seconds,
  );

  TestValidator.equals(
    "slaConfig is_active flag remains stable between reads",
    firstViolation.slaConfig.is_active,
    secondViolation.slaConfig.is_active,
  );

  // 9. Sanity check on optional foreign-key reference type when present
  if (
    firstViolation.slaConfig.shopping_mall_business_policy_version_id !==
      null &&
    firstViolation.slaConfig.shopping_mall_business_policy_version_id !==
      undefined
  ) {
    typia.assert<string & tags.Format<"uuid">>(
      firstViolation.slaConfig.shopping_mall_business_policy_version_id,
    );
  }
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCancellationPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationPolicy";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";

/**
 * Validate creation of a fully configured cancellation policy by a platform
 * admin.
 *
 * Business flow:
 *
 * 1. A new platform administrator joins via /auth/platformAdmin/join.
 *
 *    - This returns IShoppingMallPlatformAdmin.IAuthorized and the SDK automatically
 *         attaches the access token to the connection headers.
 * 2. Using the authenticated admin session, the test calls POST
 *    /shoppingMall/platformAdmin/cancellationPolicies to create a new
 *    cancellation policy with a comprehensive configuration payload,
 *    including:
 *
 *    - Business code and name,
 *    - Long-form description,
 *    - Allow_cancellation_before_shipment and allow_partial_cancellation flags,
 *    - Max_hours_after_payment as a positive integer,
 *    - Config_payload JSON string for extra rules,
 *    - Effective_from and effective_to as a coherent time window,
 *    - Active flag set to true,
 *    - Region_code and policy_setting_code referencing existing configuration
 *         profiles (assumed to exist; this test only checks that summaries echo
 *         the codes).
 * 3. The test then validates that the response IShoppingMallCancellationPolicy:
 *
 *    - Mirrors all request fields that are persisted,
 *    - Exposes non-null region_setting and policy_setting summaries whose code
 *         fields equal the codes used in the request,
 *    - Has server-managed fields (id, created_at, updated_at) populated and
 *         deleted_at remaining null/undefined.
 */
export async function test_api_cancellation_policy_creation_with_full_configuration(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator to obtain an authorized session.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Prepare full cancellation policy creation payload.
  const now = new Date();
  const from = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour
  const to = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24 hours

  const regionCode = "KR_MAIN_MARKET";
  const policySettingCode = "CANCEL_DEFAULT";

  const createBody = {
    code: `CANCEL_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 48 as number & tags.Type<"int32">,
    config_payload: JSON.stringify({
      allowSameDayCancellation: true,
      requireReasonCodes: true,
      disallowHighValueOrders: false,
    }),
    effective_from: from.toISOString() as string & tags.Format<"date-time">,
    effective_to: to.toISOString() as string & tags.Format<"date-time">,
    active: true,
    region_code: regionCode,
    policy_setting_code: policySettingCode,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const policy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(policy);

  // 3. Validate direct mirroring of simple fields.
  TestValidator.equals(
    "cancellation policy code mirrors request",
    policy.code,
    createBody.code,
  );
  TestValidator.equals(
    "cancellation policy name mirrors request",
    policy.name,
    createBody.name,
  );
  TestValidator.equals(
    "description mirrors request",
    policy.description ?? null,
    createBody.description ?? null,
  );
  TestValidator.equals(
    "allow_cancellation_before_shipment mirrors request",
    policy.allow_cancellation_before_shipment,
    createBody.allow_cancellation_before_shipment,
  );
  TestValidator.equals(
    "allow_partial_cancellation mirrors request",
    policy.allow_partial_cancellation,
    createBody.allow_partial_cancellation,
  );
  TestValidator.equals(
    "max_hours_after_payment mirrors request",
    policy.max_hours_after_payment ?? null,
    createBody.max_hours_after_payment ?? null,
  );
  TestValidator.equals(
    "config_payload mirrors request",
    policy.config_payload ?? null,
    createBody.config_payload ?? null,
  );
  TestValidator.equals(
    "effective_from mirrors request",
    policy.effective_from ?? null,
    createBody.effective_from ?? null,
  );
  TestValidator.equals(
    "effective_to mirrors request",
    policy.effective_to ?? null,
    createBody.effective_to ?? null,
  );
  TestValidator.equals(
    "active flag mirrors request",
    policy.active,
    createBody.active,
  );

  // 4. Validate association summaries for region and policy setting.
  TestValidator.predicate(
    "region_setting summary is present when region_code provided",
    policy.region_setting !== null && policy.region_setting !== undefined,
  );
  if (policy.region_setting !== null && policy.region_setting !== undefined) {
    TestValidator.equals(
      "region_setting.code equals requested region_code",
      policy.region_setting.code,
      regionCode,
    );
  }

  TestValidator.predicate(
    "policy_setting summary is present when policy_setting_code provided",
    policy.policy_setting !== null && policy.policy_setting !== undefined,
  );
  if (policy.policy_setting !== null && policy.policy_setting !== undefined) {
    TestValidator.equals(
      "policy_setting.code equals requested policy_setting_code",
      policy.policy_setting.code,
      policySettingCode,
    );
  }

  // 5. Validate server-managed fields.
  TestValidator.predicate(
    "policy.id must be a non-empty UUID string",
    typeof policy.id === "string" && policy.id.length > 0,
  );
  TestValidator.predicate(
    "created_at must be a non-empty ISO date-time string",
    typeof policy.created_at === "string" && policy.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at must be a non-empty ISO date-time string",
    typeof policy.updated_at === "string" && policy.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at should be null or undefined for newly created policy",
    policy.deleted_at ?? null,
    null,
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAgeRestrictionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAgeRestrictionPolicy";
import type { IShoppingMallCancellationPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationPolicy";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicyOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyOverview";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";
import type { IShoppingMallRefundPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundPolicy";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";
import type { IShoppingMallReviewPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewPolicy";

/**
 * Verify role-based access control for the platform admin policy overview
 * endpoint.
 *
 * Business objectives:
 *
 * - Ensure that only authenticated platform administrators can successfully call
 *   GET /shoppingMall/platformAdmin/policies/overview.
 * - Validate that the overview response contains policy data that matches
 *   previously created policy settings and cancellation policies for a valid
 *   admin session.
 * - Confirm that unauthenticated and invalidly authenticated callers cannot
 *   access the overview and do not receive any partial configuration data.
 *
 * High-level scenario:
 *
 * 1. Register a new platform admin via POST /auth/platformAdmin/join; this
 *    automatically attaches a valid Authorization header with a JWT access
 *    token onto the shared connection.
 * 2. As this admin, create a policy setting profile using POST
 *    /shoppingMall/platformAdmin/policySettings.
 * 3. As the same admin, create a cancellation policy using POST
 *    /shoppingMall/platformAdmin/cancellationPolicies and associate it with the
 *    created policy setting via its code.
 * 4. While still authenticated as platform admin, call GET
 *    /shoppingMall/platformAdmin/policies/overview and verify:
 *
 *    - The response is a valid IShoppingMallPolicyOverview.
 *    - The policySettings collection contains the created policy setting.
 *    - The cancellationPolicies collection contains the created cancellation policy.
 * 5. Create an unauthenticated connection (no Authorization header) and confirm
 *    that calling the overview endpoint results in an authorization error using
 *    TestValidator.error.
 * 6. Create a second derived connection with an intentionally invalid
 *    Authorization header value and again confirm that calling the overview
 *    endpoint results in an authorization error.
 */
export async function test_api_platform_admin_policy_overview_role_based_access_control(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin and obtain a valid Authorization token.
  const adminJoinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert(admin);

  // 2. Create a policy setting profile as the authenticated platform admin.
  const policySettingCode = `ps_${RandomGenerator.alphaNumeric(12)}`;
  const policySettingRequest = {
    code: policySettingCode,
    name: "Default Cancellation Policy Setting",
    category: "cancellation",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    config_payload: JSON.stringify({
      kind: "cancellation_default",
      windowHours: 24,
    }),
    active: true,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      {
        body: policySettingRequest,
      },
    );
  typia.assert(policySetting);

  // 3. Create a cancellation policy linked to the above policy setting.
  const cancellationPolicyCode = `cp_${RandomGenerator.alphaNumeric(12)}`;
  const cancellationPolicyRequest = {
    code: cancellationPolicyCode,
    name: "Standard Order Cancellation Policy",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 48,
    config_payload: JSON.stringify({
      windowHours: 48,
      allowAfterShipment: false,
    }),
    active: true,
    policy_setting_code: policySettingCode,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      {
        body: cancellationPolicyRequest,
      },
    );
  typia.assert(cancellationPolicy);

  // 4. Authorized call: overview must succeed and include created policies.
  const overview: IShoppingMallPolicyOverview =
    await api.functional.shoppingMall.platformAdmin.policies.overview.at(
      connection,
    );
  typia.assert(overview);

  // Verify that the created policy setting is present in policySettings.
  const foundPolicySetting = overview.policySettings.find(
    (p) => p.code === policySetting.code,
  );
  TestValidator.predicate(
    "overview should contain the created policy setting",
    () => foundPolicySetting !== undefined,
  );

  // Verify that the created cancellation policy is present in cancellationPolicies.
  const foundCancellationPolicy = overview.cancellationPolicies.find(
    (p) => p.code === cancellationPolicy.code,
  );
  TestValidator.predicate(
    "overview should contain the created cancellation policy",
    () => foundCancellationPolicy !== undefined,
  );

  // 5. Unauthenticated call: derive a connection without Authorization.
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated caller must not access policy overview",
    async () => {
      await api.functional.shoppingMall.platformAdmin.policies.overview.at(
        unauthConn,
      );
    },
  );

  // 6. Invalid-token call: derive a connection with a bogus Authorization header.
  const invalidTokenConn: api.IConnection = {
    ...connection,
    headers: {
      Authorization: "Bearer invalid-token-for-test",
    },
  };

  await TestValidator.error(
    "caller with invalid token must not access policy overview",
    async () => {
      await api.functional.shoppingMall.platformAdmin.policies.overview.at(
        invalidTokenConn,
      );
    },
  );
}

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
 * Validate policy overview for a freshly created platform admin with no
 * explicit policies configured.
 *
 * Business context: The platform exposes a consolidated policy overview
 * endpoint for platform administrators at GET
 * /shoppingMall/platformAdmin/policies/overview. This endpoint aggregates
 * policySettings, cancellationPolicies, refundPolicies, reviewPolicies and
 * ageRestrictionPolicies into a single IShoppingMallPolicyOverview response for
 * use in admin dashboards.
 *
 * This scenario validates behavior when a platform is effectively in an "empty
 * configuration" state from the viewpoint of this test: we do not create any
 * policy records via admin APIs in this scenario and simply rely on whatever
 * initial state (possibly zero rows or system defaults) the backend provides.
 *
 * Test steps:
 *
 * 1. Register and authenticate a new platform admin via POST
 *    /auth/platformAdmin/join.
 *
 *    - Build a realistic join payload using IShoppingMallPlatformAdminJoin.IRequest
 *
 *         - Email: random but valid email
 *         - Name: random display name
 *         - Password: any non-empty string
 *         - Ip: either undefined or null (no strict requirement)
 *         - Href/referrer: valid URI strings
 *    - Call api.functional.auth.platformAdmin.join(connection, { body: ... }).
 *    - Validate the returned IShoppingMallPlatformAdmin.IAuthorized with
 *         typia.assert.
 *    - Rely on the SDK to inject the Authorization header into the shared
 *         connection.
 * 2. Call GET /shoppingMall/platformAdmin/policies/overview using the
 *    authenticated connection.
 *
 *    - Invoke api.functional.shoppingMall.platformAdmin.policies.overview.at(connection).
 *    - Validate the response with typia.assert<IShoppingMallPolicyOverview>(...).
 *         This covers detailed type and format validation, including nested
 *         summary DTOs.
 * 3. Structural and business-logic assertions on the overview payload:
 *
 *    - Ensure that the top-level object is non-null and structurally valid (already
 *         covered by typia.assert).
 *    - For each collection property on IShoppingMallPolicyOverview:
 *
 *         - PolicySettings
 *         - CancellationPolicies
 *         - RefundPolicies
 *         - ReviewPolicies
 *         - AgeRestrictionPolicies Use Array.isArray to confirm the value is an array
 *                   (this also distinguishes it from null/undefined). Use
 *                   TestValidator.predicate with descriptive titles for these
 *                   checks.
 *    - Optionally, assert that none of these properties is null or undefined by
 *         simple predicate checks (again, typia.assert already guarantees
 *         non-null, but the predicates emphasize the behavior expected by the
 *         scenario: arrays instead of nulls).
 * 4. Do NOT assert on specific contents:
 *
 *    - Do not assume the arrays are empty; the backend may seed default system
 *         policies. The test only needs to guarantee that the endpoint behaves
 *         gracefully with no explicit policy creation in this test (no 5xx
 *         errors, structurally correct payload, arrays instead of
 *         null/undefined).
 *    - Do not test for specific status codes or error codes; rely on successful
 *         invocation and typia.assert not throwing.
 *
 * Error handling expectations:
 *
 * - If the join or overview call fails (e.g., due to authorization), the test
 *   will naturally fail by throwing, which is acceptable. We do not write
 *   explicit TestValidator.error clauses here because the happy-path behavior
 *   is the primary concern for this scenario.
 */
export async function test_api_platform_admin_policy_overview_empty_configuration(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new platform admin.
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    // Leave ip as undefined to simulate missing optional client IP.
    ip: undefined,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Call the policy overview endpoint with the authenticated connection.
  const overview: IShoppingMallPolicyOverview =
    await api.functional.shoppingMall.platformAdmin.policies.overview.at(
      connection,
    );
  typia.assert<IShoppingMallPolicyOverview>(overview);

  // 3. Structural and business-logic assertions on the overview payload.
  TestValidator.predicate(
    "policySettings should be returned as an array (not null/undefined)",
    Array.isArray(overview.policySettings),
  );
  TestValidator.predicate(
    "cancellationPolicies should be returned as an array (not null/undefined)",
    Array.isArray(overview.cancellationPolicies),
  );
  TestValidator.predicate(
    "refundPolicies should be returned as an array (not null/undefined)",
    Array.isArray(overview.refundPolicies),
  );
  TestValidator.predicate(
    "reviewPolicies should be returned as an array (not null/undefined)",
    Array.isArray(overview.reviewPolicies),
  );
  TestValidator.predicate(
    "ageRestrictionPolicies should be returned as an array (not null/undefined)",
    Array.isArray(overview.ageRestrictionPolicies),
  );
}

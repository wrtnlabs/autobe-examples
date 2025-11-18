import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAccountRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccountRiskFlag";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Validate creation of an inactive account risk flag by an authenticated admin.
 *
 * Business goal
 *
 * - Ensure an administrator can register a customer-focused risk flag that is
 *   stored in the risk subsystem but not currently effective (active=false).
 * - Confirm that the API accepts such inactive flags and that all business fields
 *   are persisted as sent.
 *
 * End-to-end flow
 *
 * 1. Register an admin via POST /auth/admin/join.
 *
 *    - Use IShoppingMallAdminJoin.ICreate with realistic email/password and required
 *         session context fields (href, referrer). ip can be omitted to let the
 *         backend infer it.
 *    - Verify that the response (IShoppingMallAdmin.IAuthorized) is structurally
 *         valid using typia.assert.
 *    - Rely on the SDK to attach the access token to the shared connection.
 * 2. Create an inactive risk flag via POST /shoppingMall/admin/accountRiskFlags.
 *
 *    - Call api.functional.shoppingMall.admin.accountRiskFlags.create with body:
 *         IShoppingMallAccountRiskFlag.ICreate populated as:
 *
 *         - Actor_type: "customer" (targeting customer accounts)
 *         - Code: a stable, descriptive identifier such as "MANUAL_REVIEW_COMPLETE"
 *         - Severity: "low" (informational level)
 *         - Active: false (flag is stored but not effective)
 *         - Reason: a descriptive string explaining that this is for informational or
 *                   historical tracking
 *         - Expires_at: explicitly null to indicate no automatic expiration
 * 3. Validate the create response.
 *
 *    - Use typia.assert on the returned IShoppingMallAccountRiskFlag to ensure all
 *         structural and format constraints are satisfied (UUID id, date-time
 *         timestamps, nullable fields, etc.).
 *    - Use TestValidator.equals to verify that core business fields in the response
 *         match the request body values:
 *
 *         - Actor_type
 *         - Code
 *         - Severity
 *         - Active (must remain false)
 *         - Reason (string equality)
 *         - Expires_at (null)
 *    - Additionally, assert that the generated id is non-empty and that created_at
 *         and updated_at are present (implicitly covered by typia.assert).
 *
 * Notes and constraints
 *
 * - The optional follow-up GET /shoppingMall/admin/accountRiskFlags/{riskFlagId}
 *   mentioned in the scenario draft is not available in the provided SDK
 *   function list, so persistence re-fetch validation is limited to the
 *   immediate create response.
 * - No type-error or invalid-payload tests are implemented; the focus is on the
 *   successful business path for creating an inactive risk flag.
 */
export async function test_api_account_risk_flag_creation_inactive_flag(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain an authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.example.com/onboarding",
    referrer: "https://admin.example.com/login",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Prepare risk flag creation payload with inactive state
  const riskFlagCreateBody = {
    actor_type: "customer",
    code: "MANUAL_REVIEW_COMPLETE",
    reason:
      "Informational flag indicating manual review has been completed without active restrictions.",
    severity: "low",
    active: false,
    expires_at: null,
  } satisfies IShoppingMallAccountRiskFlag.ICreate;

  // 3. Create the risk flag
  const createdFlag =
    await api.functional.shoppingMall.admin.accountRiskFlags.create(
      connection,
      {
        body: riskFlagCreateBody,
      },
    );
  typia.assert<IShoppingMallAccountRiskFlag>(createdFlag);

  // 4. Verify that returned business fields mirror the request
  TestValidator.equals(
    "risk flag actor_type should match request",
    createdFlag.actor_type,
    riskFlagCreateBody.actor_type,
  );
  TestValidator.equals(
    "risk flag code should match request",
    createdFlag.code,
    riskFlagCreateBody.code,
  );
  TestValidator.equals(
    "risk flag severity should match request",
    createdFlag.severity,
    riskFlagCreateBody.severity,
  );
  TestValidator.equals(
    "risk flag active should remain false",
    createdFlag.active,
    riskFlagCreateBody.active,
  );
  TestValidator.equals(
    "risk flag reason should match request",
    createdFlag.reason,
    riskFlagCreateBody.reason,
  );
  TestValidator.equals(
    "risk flag expires_at should match request (null for no expiry)",
    createdFlag.expires_at,
    riskFlagCreateBody.expires_at,
  );
}

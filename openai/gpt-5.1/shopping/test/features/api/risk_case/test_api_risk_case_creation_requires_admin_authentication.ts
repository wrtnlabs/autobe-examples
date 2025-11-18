import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";

/**
 * Verify that risk case creation is restricted to authenticated admin actors.
 *
 * Business goal:
 *
 * - Ensure POST /shoppingMall/admin/riskCases cannot be used without a valid
 *   admin authentication context.
 * - Confirm that once an admin is properly joined (registered) and the connection
 *   carries its Authorization header, the same payload succeeds.
 *
 * Scenario steps:
 *
 * 1. Prepare a realistic IShoppingMallRiskCase.ICreate payload.
 * 2. Derive an unauthenticated connection from the provided `connection` parameter
 *    without reusing any Authorization header (headers: {}).
 * 3. Call api.functional.shoppingMall.admin.riskCases.create with the
 *    unauthenticated connection and the prepared body.
 *
 *    - Expect an HTTP error due to missing/invalid admin token.
 *    - Use TestValidator.httpError with 401 or 403 as acceptable outcomes.
 * 4. Execute admin join on the original authenticated-capable connection using
 *    api.functional.auth.admin.join with a valid IShoppingMallAdminJoin.ICreate
 *    payload.
 *
 *    - Use typia.random<IShoppingMallAdminJoin.ICreate>() to generate the body so
 *         that email/password, href, referrer, and ip are all valid formats.
 *    - Capture the returned IShoppingMallAdmin.IAuthorized and assert it via
 *         typia.assert.
 *    - The SDK will automatically set connection.headers.Authorization to the issued
 *         access token; do not modify headers manually.
 * 5. Reuse the same risk-case body and call
 *    api.functional.shoppingMall.admin.riskCases.create with the now-auth
 *    original connection.
 *
 *    - Expect success and a concrete IShoppingMallRiskCase response.
 *    - Validate the response with typia.assert.
 *    - Optionally verify that core business fields (case_code, title, status,
 *         severity) echo the request body values using TestValidator.equals.
 *
 * Constraints and rules:
 *
 * - NEVER touch or mutate `connection.headers` directly in the test; rely on the
 *   SDK's internal header management. The only allowed header difference is
 *   creating a shallow-cloned unauthenticated connection object with `headers:
 *   {}`.
 * - Use typia.random with explicit generic types for DTOs.
 * - All API calls must be awaited.
 * - Use TestValidator.httpError (not plain error) to assert 401/403 on the
 *   unauthenticated call and provide a descriptive title.
 * - Request bodies must use `satisfies` with the correct DTO variants:
 *
 *   - IShoppingMallRiskCase.ICreate for riskCases.create
 *   - IShoppingMallAdminJoin.ICreate for auth.admin.join
 */
export async function test_api_risk_case_creation_requires_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Prepare a realistic risk case creation payload
  const riskCaseBody = {
    case_code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    status: "open",
    severity: RandomGenerator.pick([
      "low",
      "medium",
      "high",
      "critical",
    ] as const),
    primary_subject_type: RandomGenerator.pick([
      "customer",
      "seller",
      "order",
      "payment",
    ] as const),
    primary_subject_id: typia.random<string & tags.Format<"uuid">>(),
    primary_subject_display: RandomGenerator.paragraph({ sentences: 2 }),
    sla_due_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  } satisfies IShoppingMallRiskCase.ICreate;

  // 2. Derive an unauthenticated connection by cloning but with empty headers
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Attempt to create a risk case without admin authentication
  await TestValidator.httpError(
    "risk case creation must fail without admin authentication",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.admin.riskCases.create(
        unauthConnection,
        {
          body: riskCaseBody,
        },
      );
    },
  );

  // 4. Join as an admin on the original connection to establish auth context
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 5. Retry risk case creation with authenticated admin connection
  const createdCase: IShoppingMallRiskCase =
    await api.functional.shoppingMall.admin.riskCases.create(connection, {
      body: riskCaseBody,
    });
  typia.assert<IShoppingMallRiskCase>(createdCase);

  // Basic field echo validations
  TestValidator.equals(
    "created risk case must preserve case_code from request body",
    createdCase.case_code,
    riskCaseBody.case_code,
  );
  TestValidator.equals(
    "created risk case must preserve title from request body",
    createdCase.title,
    riskCaseBody.title,
  );
  TestValidator.equals(
    "created risk case must preserve status from request body",
    createdCase.status,
    riskCaseBody.status,
  );
  TestValidator.equals(
    "created risk case must preserve severity from request body",
    createdCase.severity,
    riskCaseBody.severity,
  );
}

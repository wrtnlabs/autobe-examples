import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";

/**
 * Verify that requesting a risk case detail with a non-existent business code
 * fails with a not-found style error in an authenticated admin context.
 *
 * Business context:
 *
 * - Risk cases are internal governance/fraud investigation records stored in
 *   shopping_mall_risk_cases and exposed to admin actors via GET
 *   /shoppingMall/admin/riskCases/{riskCaseCode}.
 * - Admin consoles or tooling may navigate directly to a case detail URL using a
 *   human-friendly business code (case_code), so the backend must differentiate
 *   clearly between existing and non-existing codes.
 * - For non-existent codes, the platform should surface a safe, user-friendly
 *   not-found error instead of returning a successful case payload or leaking
 *   low-level details.
 *
 * Scenario steps:
 *
 * 1. Register a new admin using POST /auth/admin/join with a realistic join
 *    payload. The SDK will automatically attach the returned token to the
 *    connection so that subsequent calls are authenticated as this admin.
 * 2. Construct a syntactically plausible but guaranteed-nonexistent riskCaseCode,
 *    such as a fixed string prefix plus a randomized suffix, to avoid clashing
 *    with any fixtures or pre-seeded data.
 * 3. Call GET /shoppingMall/admin/riskCases/{riskCaseCode} through
 *    api.functional.shoppingMall.admin.riskCases.at using that unknown code.
 * 4. Use TestValidator.error to assert that the call fails, proving that the
 *    detail endpoint distinguishes missing cases from existing ones and does
 *    not return an IShoppingMallRiskCase for an unknown code.
 *
 * Constraints and notes:
 *
 * - We must not try to inspect HTTP status codes explicitly, nor should we depend
 *   on any particular HttpError subclass. It is sufficient to assert that some
 *   error is thrown by the SDK when the riskCaseCode does not resolve to a
 *   record.
 * - We must not create any risk case data in this test; it is strictly a
 *   negative-path validation using a non-existent business code.
 * - No manual manipulation of connection.headers is allowed; authentication is
 *   entirely handled by the join call.
 */
export async function test_api_risk_case_detail_not_found_for_unknown_code(
  connection: api.IConnection,
) {
  // 1. Register a new admin to obtain an authenticated context.
  const joinBody = {
    email: `risk-admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    href: "https://admin.example.com/join/risk-cases",
    referrer: "https://admin.example.com/login",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Build a syntactically valid but non-existent riskCaseCode.
  const unknownRiskCaseCode = `RISK-NOT-EXIST-${RandomGenerator.alphaNumeric(12)}`;

  // 3. Attempt to load the non-existent risk case and assert it results in an error.
  await TestValidator.error(
    "non-existent risk case code must fail",
    async () => {
      await api.functional.shoppingMall.admin.riskCases.at(connection, {
        riskCaseCode: unknownRiskCaseCode,
      });
    },
  );
}

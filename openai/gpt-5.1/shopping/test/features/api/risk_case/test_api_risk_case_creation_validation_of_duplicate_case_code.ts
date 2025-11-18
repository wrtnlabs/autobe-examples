import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";

/**
 * Ensure that creating a risk case enforces uniqueness of `case_code`.
 *
 * Business context:
 *
 * - Risk and fraud teams manage high-level risk cases using stable business
 *   identifiers stored in `shopping_mall_risk_cases.case_code`.
 * - `case_code` has a unique index at the database layer and must not be
 *   duplicated, even by the same admin.
 *
 * This test covers the following end-to-end flow:
 *
 * 1. Register an admin via POST /auth/admin/join and obtain an authenticated
 *    context (SDK automatically sets Authorization header).
 * 2. Create an initial risk case via POST /shoppingMall/admin/riskCases with a
 *    specific `case_code` using IShoppingMallRiskCase.ICreate and assert
 *    success and type correctness.
 * 3. Attempt to create a second risk case with the exact same `case_code` but
 *    otherwise valid fields.
 * 4. Assert that the second creation attempt fails by throwing an error, thereby
 *    validating the uniqueness constraint on `case_code` without asserting
 *    specific HTTP status codes or error payloads.
 */
export async function test_api_risk_case_creation_validation_of_duplicate_case_code(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain an authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create the first risk case with a fixed case_code
  const caseCode = "RISK-DUP-0001";

  const firstRiskCaseBody = {
    case_code: caseCode,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "open",
    severity: "high",
    primary_subject_type: undefined,
    primary_subject_id: undefined,
    primary_subject_display: undefined,
    sla_due_at: undefined,
  } satisfies IShoppingMallRiskCase.ICreate;

  const firstRiskCase: IShoppingMallRiskCase =
    await api.functional.shoppingMall.admin.riskCases.create(connection, {
      body: firstRiskCaseBody,
    });
  typia.assert(firstRiskCase);

  // Validate that the created case echoes back the requested case_code
  TestValidator.equals(
    "first risk case should preserve requested case_code",
    firstRiskCase.case_code,
    caseCode,
  );

  // 3. Attempt to create a second risk case with the same case_code
  const secondRiskCaseBody = {
    case_code: caseCode,
    title: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "open",
    severity: "medium",
    primary_subject_type: undefined,
    primary_subject_id: undefined,
    primary_subject_display: undefined,
    sla_due_at: undefined,
  } satisfies IShoppingMallRiskCase.ICreate;

  // 4. Assert that a duplicate case_code triggers an error
  await TestValidator.error(
    "duplicate case_code risk case creation must fail",
    async () => {
      await api.functional.shoppingMall.admin.riskCases.create(connection, {
        body: secondRiskCaseBody,
      });
    },
  );
}

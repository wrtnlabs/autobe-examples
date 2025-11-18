import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";

/**
 * Validate deletion of a risk case that has already been moved to a terminal
 * (closed) lifecycle state.
 *
 * Business goals:
 *
 * - Ensure that admins can delete risk cases even after they have been
 *   transitioned into a closed state, as long as platform policies allow
 *   deletion.
 * - Ensure that once deleted, the same business code cannot be deleted again and
 *   surfaces a clear business error (e.g., not-found), proving that no partial
 *   state remains.
 *
 * Technical constraints and adaptations:
 *
 * - No GET endpoint for individual risk cases is present in the provided SDK, so
 *   we infer deletion success by attempting a second DELETE and asserting that
 *   it now fails.
 * - We must not assert specific HTTP status codes, only the presence of an error
 *   on repeated delete.
 *
 * Flow:
 *
 * 1. Join as an admin via POST /auth/admin/join, receiving
 *    IShoppingMallAdmin.IAuthorized.
 * 2. Create a new risk case via POST /shoppingMall/admin/riskCases using
 *    IShoppingMallRiskCase.ICreate.
 * 3. Transition the case to a closed/terminal state via PUT
 *    /shoppingMall/admin/riskCases/{riskCaseCode} using
 *    IShoppingMallRiskCase.IUpdate.
 * 4. Delete the risk case via DELETE /shoppingMall/admin/riskCases/{riskCaseCode}.
 * 5. Attempt to delete the same riskCaseCode again and assert that this second
 *    attempt throws.
 */
export async function test_api_admin_risk_case_delete_terminal_case(
  connection: api.IConnection,
) {
  // 1. Register an admin (join) to obtain authorized admin context + tokens.
  const joinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  const closerAdminId: (string & tags.Format<"uuid">) | null =
    adminAuthorized.admin?.id ?? null;

  // 2. Create a new high-severity, initially-open risk case.
  const caseCode: string = `RC-${RandomGenerator.alphaNumeric(12)}`;

  const createBody = {
    case_code: caseCode,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    status: "open",
    severity: "high",
    primary_subject_type: null,
    primary_subject_id: null,
    primary_subject_display: null,
    sla_due_at: null,
  } satisfies IShoppingMallRiskCase.ICreate;

  const createdCase: IShoppingMallRiskCase =
    await api.functional.shoppingMall.admin.riskCases.create(connection, {
      body: createBody,
    });
  typia.assert(createdCase);

  TestValidator.equals(
    "created risk case should have matching case_code",
    createdCase.case_code,
    caseCode,
  );

  // 3. Transition the case into a closed/terminal state.
  const nowIso: string = new Date().toISOString();

  const updateBody = {
    status: "closed",
    closed_at: nowIso,
    closed_by_admin_id: closerAdminId,
  } satisfies IShoppingMallRiskCase.IUpdate;

  const closedCase: IShoppingMallRiskCase =
    await api.functional.shoppingMall.admin.riskCases.update(connection, {
      riskCaseCode: caseCode,
      body: updateBody,
    });
  typia.assert(closedCase);

  TestValidator.equals(
    "risk case status should be updated to closed",
    closedCase.status,
    "closed",
  );

  // 4. Delete the now-closed risk case.
  await api.functional.shoppingMall.admin.riskCases.erase(connection, {
    riskCaseCode: caseCode,
  });

  // 5. Attempt to delete again and expect an error, proving it no longer exists.
  await TestValidator.error(
    "second delete on same riskCaseCode must fail",
    async () => {
      await api.functional.shoppingMall.admin.riskCases.erase(connection, {
        riskCaseCode: caseCode,
      });
    },
  );
}

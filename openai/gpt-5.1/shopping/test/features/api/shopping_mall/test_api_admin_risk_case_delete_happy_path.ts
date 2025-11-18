import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";

/**
 * Happy-path deletion of an admin-created ShoppingMall risk case by business
 * case code.
 *
 * Business purpose:
 *
 * - Ensure that an authenticated admin can delete an existing risk case using its
 *   stable business identifier (case_code / riskCaseCode).
 * - Confirm that once deleted, the risk case cannot be deleted again, indirectly
 *   asserting that it is no longer present.
 *
 * Steps:
 *
 * 1. Register a new admin via POST /auth/admin/join using
 *    api.functional.auth.admin.join.
 *
 *    - Use typia.random<IShoppingMallAdminJoin.ICreate>() to generate a valid join
 *         payload.
 *    - The SDK will automatically attach the admin access token to the shared
 *         connection.
 * 2. As the authenticated admin, create a new risk case via POST
 *    /shoppingMall/admin/riskCases using
 *    api.functional.shoppingMall.admin.riskCases.create.
 *
 *    - Build the request body to satisfy IShoppingMallRiskCase.ICreate with:
 *
 *         - Case_code: random alpha-numeric string.
 *         - Title: short random paragraph.
 *         - Description: optional random paragraph.
 *         - Status: "open".
 *         - Severity: "low".
 *    - Assert the response type using typia.assert and store the case_code.
 * 3. Invoke DELETE /shoppingMall/admin/riskCases/{riskCaseCode} via
 *    api.functional.shoppingMall.admin.riskCases.erase using the stored
 *    case_code.
 *
 *    - Expect the call to succeed without throwing; response type is void.
 * 4. Attempt a second deletion on the same riskCaseCode wrapped in
 *    TestValidator.error, asserting that an error is thrown (not-found or
 *    business rule), which shows that the case is no longer deletable.
 *
 * Assertions:
 *
 * - Admin join returns a valid IShoppingMallAdmin.IAuthorized structure.
 * - Risk case creation returns a valid IShoppingMallRiskCase whose case_code
 *   matches the value sent in IShoppingMallRiskCase.ICreate.
 * - First deletion succeeds without error.
 * - Second deletion on the same riskCaseCode fails and is captured by
 *   TestValidator.error.
 */
export async function test_api_admin_risk_case_delete_happy_path(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authenticated context.
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a new risk case as this admin.
  const caseCode: string = RandomGenerator.alphaNumeric(16);

  const riskCaseCreateBody = {
    case_code: caseCode,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "open",
    severity: "low",
  } satisfies IShoppingMallRiskCase.ICreate;

  const createdRiskCase: IShoppingMallRiskCase =
    await api.functional.shoppingMall.admin.riskCases.create(connection, {
      body: riskCaseCreateBody,
    });
  typia.assert(createdRiskCase);

  // Ensure created case uses the same business code we requested.
  TestValidator.equals(
    "created risk case should keep requested case_code",
    createdRiskCase.case_code,
    caseCode,
  );

  // 3. Delete the risk case by its business code.
  await api.functional.shoppingMall.admin.riskCases.erase(connection, {
    riskCaseCode: caseCode,
  });

  // 4. Second deletion should fail, indicating the case is gone.
  await TestValidator.error(
    "second delete on same riskCaseCode should fail",
    async () => {
      await api.functional.shoppingMall.admin.riskCases.erase(connection, {
        riskCaseCode: caseCode,
      });
    },
  );
}

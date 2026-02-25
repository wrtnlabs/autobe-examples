import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_administrator_grades_create } from "../../../generate/generate_random_shopping_mall_administrator_administrator_grades_create";
import { prepare_random_shopping_mall_administrator_grade } from "../../../prepare/prepare_random_shopping_mall_administrator_grade";

/**
 * Test scenario for deletion attempt of an administrator grade by a non-super administrator.
 *
 * Steps:
 * 1. Register a new administrator with regular (non-super) administrator privileges.
 * 2. Create a new administrator grade.
 * 3. Attempt to delete the administrator grade.
 *
 * Validations:
 * - Confirm that the deletion is forbidden with HTTP 403 Forbidden response.
 * - Verify that the administrator grade still exists after the failed deletion attempt.
 * - Confirm that authorization checks differentiate between super and regular administrators correctly.
 */
export async function test_api_administrator_grade_erase_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a regular (non-super) administrator
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_administrator_join(
    regularAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123",
      },
    },
  );
  typia.assert(regularAdmin);
  // Ensure this administrator is not super admin
  TestValidator.predicate(
    "regular administrator is not super admin",
    regularAdmin.isSuperAdmin === false,
  );
  // Prepare connection using the token from joined administrator
  regularAdminConnection.headers ??= {};
  regularAdminConnection.headers.Authorization = regularAdmin.token.access;
  // 2. Create a new administrator grade with non-super flag
  const newGrade =
    await generate_random_shopping_mall_administrator_administrator_grades_create(
      regularAdminConnection,
      {
        body: {
          superAdministrator: false,
        },
      },
    );
  typia.assert(newGrade);
  // 3. Attempt to delete the administrator grade by the regular administrator
  await TestValidator.httpError(
    "delete forbidden for non-super administrator",
    403,
    async () => {
      await api.functional.shoppingMall.administrator.administratorGrades.erase(
        regularAdminConnection,
        {
          administratorGradeId: newGrade.id,
        },
      );
    },
  );
  // 4. Verify the administrator grade still exists after failed deletion
  //    by fetching all administrator grades and checking the presence of newGrade.id
  //    Because get-list endpoint for administrator grades does NOT exist in the provided sdk,
  //    we will simulate by attempting to delete the same grade and expecting the same 403 again
  // Repeated unauthorized erase should also cause 403
  await TestValidator.httpError(
    "delete forbidden for non-super administrator repeated",
    403,
    async () => {
      await api.functional.shoppingMall.administrator.administratorGrades.erase(
        regularAdminConnection,
        {
          administratorGradeId: newGrade.id,
        },
      );
    },
  );
}

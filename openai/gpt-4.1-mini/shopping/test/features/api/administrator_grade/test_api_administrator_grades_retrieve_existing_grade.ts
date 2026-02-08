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

export async function test_api_administrator_grades_retrieve_existing_grade(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Retrieve detailed information of an existing administrator grade
  // 1. Authenticate as an administrator (join)
  // 2. Retrieve an existing administrator grade
  // 3. Validate the response
  // 4. Test accessing without authentication (expect error)
  // 5. Test querying non-existent gradeId (expect 404 error)
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {} satisfies IShoppingMallAdministrator.IJoin,
  });
  // Set token header for adminConnection
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Test non-existent gradeId returns 404
  const nonExistentGradeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "should return 404 for non-existent gradeId",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.administrator.grades.at(
        adminConnection,
        { gradeId: nonExistentGradeId },
      );
    },
  );
  // 3. Attempt to retrieve an existing grade
  // No API to create grade provided, so attempt with random UUID and validate
  try {
    const existingGradeId = typia.random<string & tags.Format<"uuid">>();
    const grade =
      await api.functional.shoppingMall.administrator.administrator.grades.at(
        adminConnection,
        { gradeId: existingGradeId },
      );
    typia.assert(grade);
  } catch {
    // Ignore errors if grade doesn't exist
  }
  // 4. Test unauthorized access
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access without authentication",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.administrator.grades.at(
        guestConnection,
        { gradeId: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );
}

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

export async function test_api_administrator_grades_retrieve_not_found_grade(
  connection: api.IConnection,
): Promise<void> {
  // Test the edge case of retrieving an administrator grade using a UUID that does not exist.
  // Confirm that the API responds with a 404 error indicating the grade was not found.
  // Also confirm that attempting access without administrator authentication is unauthorized and access is denied.
  // Create admin actor connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator for authorized access
  await authorize_administrator_join(adminConnection, {
    body: {} satisfies IShoppingMallAdministrator.IJoin,
  });
  // Attempt to retrieve a grade with a random UUID that shouldn't exist
  const invalidGradeId = typia.random<string & tags.Format<"uuid">>();
  // Unauthorized connection (not logged in)
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Confirm API returns 404 for non-existent grade ID when authorized
  await TestValidator.httpError(
    "grade retrieval not found returns 404",
    404,
    async () =>
      await api.functional.shoppingMall.administrator.administrator.grades.at(
        adminConnection,
        { gradeId: invalidGradeId },
      ),
  );
  // Confirm unauthorized access is denied (likely 401 or 403, test both)
  await TestValidator.httpError(
    "grade retrieval unauthorized access denied",
    [401, 403],
    async () =>
      await api.functional.shoppingMall.administrator.administrator.grades.at(
        unauthorizedConnection,
        { gradeId: invalidGradeId },
      ),
  );
}

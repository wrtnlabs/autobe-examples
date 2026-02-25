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

export async function test_api_administrator_administrator_grade_update_super_admin_flag(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate by joining as an administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: { password: "1234test" },
  });
  // 2. Generate a random administrator grade ID for update (simulate existing grade)
  const administratorGradeId = typia.random<string & tags.Format<"uuid">>();
  // 3. Prepare update body: toggle the superAdministrator flag
  // Since we don't know original value, test toggling to true
  const updateBody: IShoppingMallAdministratorGrade.IUpdate = {
    superAdministrator: true,
  };
  // 4. Call updateAdministratorGrade with authorized connection
  const updatedGrade =
    await api.functional.shoppingMall.administrator.administratorGrades.updateAdministratorGrade(
      adminConnection,
      {
        administratorGradeId,
        body: updateBody,
      },
    );
  typia.assert(updatedGrade);
  // 5. Validate that superAdministrator flag is updated to the new value
  TestValidator.equals(
    "superAdministrator flag updated",
    updatedGrade.superAdministrator,
    updateBody.superAdministrator,
  );
  // 6. Validate other fields exist
  TestValidator.predicate(
    "administrator grade has id",
    typeof updatedGrade.id === "string",
  );
  TestValidator.predicate(
    "administrator grade has name",
    typeof updatedGrade.name === "string",
  );
  TestValidator.predicate(
    "administrator grade has grade",
    typeof updatedGrade.grade === "number",
  );
  // 7. Authorization test: Ensure that an unauthorized connection (no token) is rejected with 401
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized updateAdministratorGrade call (no token)",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.administratorGrades.updateAdministratorGrade(
        unauthorizedConnection,
        {
          administratorGradeId,
          body: updateBody,
        },
      );
    },
  );
}

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

export async function test_api_administrator_administrator_grade_update_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd1234",
    },
  });
  typia.assert(adminAuthorized);
  // Update header for authenticated calls
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Prepare valid update data
  const updateBody: IShoppingMallAdministratorGrade.IUpdate = {
    name: `updated-grade-${RandomGenerator.alphabets(6)}`,
    grade: typia.random<number & tags.Type<"int32">>(),
    superAdministrator: !adminAuthorized.isSuperAdmin,
  };
  // 3. Use a valid administratorGradeId for update.
  // Generate a random uuid for the id to update
  const administratorGradeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Call update API
  const updatedAdministratorGrade =
    await api.functional.shoppingMall.administrator.administratorGrades.updateAdministratorGrade(
      adminConnection,
      {
        administratorGradeId,
        body: updateBody,
      },
    );
  typia.assert(updatedAdministratorGrade);
  // 5. Validate the update results
  TestValidator.equals(
    "administrator grade name",
    updatedAdministratorGrade.name,
    updateBody.name,
  );
  TestValidator.equals(
    "administrator grade level",
    updatedAdministratorGrade.grade,
    updateBody.grade,
  );
  TestValidator.equals(
    "administrator grade superAdministrator flag",
    updatedAdministratorGrade.superAdministrator,
    updateBody.superAdministrator,
  );
}

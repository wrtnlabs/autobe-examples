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

export async function test_api_administrator_grade_erase_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new connection for administrator join
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Join as a new administrator with super administrator privileges
  // We create a join body allowing random email and password
  const newAdmin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    },
  });
  typia.assert(newAdmin);
  // 3. Confirm new administrator has super administrator privileges
  TestValidator.predicate(
    "administrator is super admin",
    newAdmin.isSuperAdmin === true,
  );
  // 4. Construct a random UUID that does not correspond to any existing administrator grade
  const nonexistentId = typia.random<string & tags.Format<"uuid">>();
  // 5. Attempt to delete the non-existent administrator grade
  await TestValidator.httpError(
    "delete non-existent administrator grade results in 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.administratorGrades.erase(
        adminConnection,
        { administratorGradeId: nonexistentId },
      );
    },
  );
}

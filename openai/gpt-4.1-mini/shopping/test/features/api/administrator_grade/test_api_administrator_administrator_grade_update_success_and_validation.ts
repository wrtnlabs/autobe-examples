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

export async function test_api_administrator_administrator_grade_update_success_and_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator via join endpoint to obtain token
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const joinedAdmin = await authorize_administrator_join(adminJoinConnection, {
    body: {},
  });
  typia.assert(joinedAdmin);
  // Setup admin authenticated connection
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = {
    Authorization: `Bearer ${joinedAdmin.token.access}`,
  };
  // 2. Generate random grade IDs
  const gradeId1 = typia.random<string & tags.Format<"uuid">>();
  const gradeId2 = typia.random<string & tags.Format<"uuid">>();
  // 3. Update grade1 with random body
  const body1 = typia.random<IShoppingMallAdministratorGrade.IUpdate>();
  const updatedGrade1 =
    await api.functional.shoppingMall.administrator.administrator.grades.updateAdministratorGrade(
      adminConnection,
      {
        gradeId: gradeId1,
        body: body1,
      },
    );
  typia.assert(updatedGrade1);
  // 4. Update grade2 with random body
  const body2 = typia.random<IShoppingMallAdministratorGrade.IUpdate>();
  const updatedGrade2 =
    await api.functional.shoppingMall.administrator.administrator.grades.updateAdministratorGrade(
      adminConnection,
      {
        gradeId: gradeId2,
        body: body2,
      },
    );
  typia.assert(updatedGrade2);
  // 5. Attempt to update grade1 with same body as grade2 to simulate duplication error
  await TestValidator.error("duplicate role name error", async () => {
    await api.functional.shoppingMall.administrator.administrator.grades.updateAdministratorGrade(
      adminConnection,
      {
        gradeId: gradeId1,
        body: body2,
      },
    );
  });
  // 6. Attempt update with unauthorized user
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized update attempt",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.administrator.grades.updateAdministratorGrade(
        unauthorizedConnection,
        {
          gradeId: gradeId1,
          body: typia.random<IShoppingMallAdministratorGrade.IUpdate>(),
        },
      );
    },
  );
}

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

export async function test_api_administrator_grade_erase_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator Join as Super Admin
  const adminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_administrator_join(adminConnection, {
    body: {
      email: `superadmin.${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "superstrongpassword",
    },
  });
  typia.assert(superAdmin);
  // Overwrite adminConnection headers with super admin token
  adminConnection.headers = { Authorization: superAdmin.token.access };
  // 2. Create Administrator Grade
  const adminGrade =
    await generate_random_shopping_mall_administrator_administrator_grades_create(
      adminConnection,
      {
        body: {
          name: `grade_${RandomGenerator.alphabets(5)}`,
          grade: 100,
          superAdministrator: false,
        },
      },
    );
  typia.assert(adminGrade);
  // 3. Delete the created Administrator Grade
  await api.functional.shoppingMall.administrator.administratorGrades.erase(
    adminConnection,
    {
      administratorGradeId: adminGrade.id,
    },
  );
  // 4. Confirm deletion by attempting to delete again expecting 404 error
  await TestValidator.httpError(
    "delete non-existing administrator grade returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.administratorGrades.erase(
        adminConnection,
        {
          administratorGradeId: adminGrade.id,
        },
      );
    },
  );
}

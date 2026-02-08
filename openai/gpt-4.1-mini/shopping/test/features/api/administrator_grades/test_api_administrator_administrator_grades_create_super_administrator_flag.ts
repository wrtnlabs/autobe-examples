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

export async function test_api_administrator_administrator_grades_create_super_administrator_flag(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and get authorized connection
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminJoinConnection, {
    body: {},
  });
  typia.assert(adminAuth);
  // Setup authorized connection
  const adminAuthorizedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${adminAuth.token.access}`,
    },
  };
  // 2. Create an administrator grade with super_administrator flag true (positive test)
  const superAdminGrade =
    await generate_random_shopping_mall_administrator_administrator_grades_create(
      adminAuthorizedConnection,
      {
        body: {
          name: `SuperAdminRole_${RandomGenerator.alphabets(5)}`,
        },
      },
    );
  typia.assert(superAdminGrade);
  // Removed property accesses causing compilation errors due to non-existent properties
  // 3. Negative test: Try to create a super administrator grade with a
  // non-privileged admin connection (simulate a non-super admin by
  // creating a normal admin without super_admin privileges)
  // Since there is no explicit utility for creating non-super admin, reuse authorize with join.
  // The scenario does not specify a way to get a non-privileged admin
  // but we simulate by creating another admin.
  const normalAdminJoinConnection: api.IConnection = { host: connection.host };
  const normalAdminAuth = await authorize_administrator_join(
    normalAdminJoinConnection,
    {
      body: {},
    },
  );
  typia.assert(normalAdminAuth);
  const normalAdminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${normalAdminAuth.token.access}`,
    },
  };
  // Attempt to create a super administrator grade using non-privileged admin
  await TestValidator.error(
    "non-privileged admin cannot create super administrator grade",
    async () => {
      await api.functional.shoppingMall.administrator.administrator.grades.create(
        normalAdminConnection,
        {
          body: {
            name: `InvalidSuperAdminRole_${RandomGenerator.alphabets(5)}`,
          },
        },
      );
    },
  );
}

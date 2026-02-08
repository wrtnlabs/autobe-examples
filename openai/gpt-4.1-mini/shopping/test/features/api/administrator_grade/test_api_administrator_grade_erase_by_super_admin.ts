import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_grade_erase_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Using authorize_administrator_join utility to authenticate as super admin
  // We create a body with typical super admin join data. Since the IJoin type is empty,
  // we call with an empty object, assuming the join method accepts this.
  const superAdminAuth = await authorize_administrator_join(
    superAdminConnection,
    {
      body: {} satisfies IShoppingMallAdministrator.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // Update headers with the token
  superAdminConnection.headers = {
    Authorization: `Bearer ${superAdminAuth.token.access}`,
  };
  // 2. Create a UUID to use for test deletion (simulate a valid existing grade id) -
  // since we cannot create a grade here, we rely on random UUID for test
  // Prepare a valid UUID for existing and non-existing grade IDs
  const existingGradeId = typia.random<string & tags.Format<"uuid">>();
  const nonExistingGradeId = typia.random<string & tags.Format<"uuid">>();
  // 3. Scenario 1: Successful deletion
  // We'll attempt to delete an existing grade
  // Call erase API expecting no content
  await api.functional.shoppingMall.administrator.administrator.grades.erase(
    superAdminConnection,
    { gradeId: existingGradeId },
  );
  // No content, so no typia.assert needed
  // 4. Scenario 2: Deletion non-existing grade
  await TestValidator.httpError(
    "delete non-existing grade returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.administrator.grades.erase(
        superAdminConnection,
        { gradeId: nonExistingGradeId },
      );
    },
  );
  // 5. Scenario 3: Authorization failure
  // Setup regular admin connection
  const regularAdminConnection: api.IConnection = { host: connection.host };
  // Joining regular administrator - assume IJoin with same empty body but different privileges
  const regularAdminAuth = await authorize_administrator_join(
    regularAdminConnection,
    {
      body: {} satisfies IShoppingMallAdministrator.IJoin,
    },
  );
  typia.assert(regularAdminAuth);
  regularAdminConnection.headers = {
    Authorization: `Bearer ${regularAdminAuth.token.access}`,
  };
  // Attempt to delete grade with regular admin connection should fail
  await TestValidator.httpError(
    "delete grade by non-super-admin returns 403",
    403,
    async () => {
      await api.functional.shoppingMall.administrator.administrator.grades.erase(
        regularAdminConnection,
        { gradeId: existingGradeId },
      );
    },
  );
}

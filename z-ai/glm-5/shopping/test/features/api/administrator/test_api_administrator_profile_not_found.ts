import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEAdministratorGrade";
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

/**
 * Test retrieving a non-existent administrator profile.
 *
 * This test validates that the system properly handles requests for
 * administrator IDs that do not exist in the database, returning a
 * 404 Not Found error.
 */
export async function test_api_administrator_profile_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Generate a non-existent UUID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test: Attempt to retrieve non-existent administrator
  // Expect 404 Not Found error
  await TestValidator.httpError(
    "non-existent administrator returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.administrators.at(
        adminConnection,
        {
          administratorId: nonExistentId,
        },
      );
    },
  );
}

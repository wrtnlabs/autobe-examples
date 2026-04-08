import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGradeChange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test attempting to retrieve a non-existent administrator grade change record.
 *
 * Validates that the administrator grade change retrieval endpoint properly handles requests for records that do not exist in the system. This ensures proper error handling and 404 responses for missing audit trail records.
 *
 * The test authenticates as an administrator, generates a valid but non-existent UUID, and attempts to retrieve the grade change record. The endpoint should respond with a 404 Not Found error.
 *
 * 1. Register and authenticate as an administrator
 * 2. Generate a valid UUID that doesn't exist in the system
 * 3. Attempt to retrieve the non-existent grade change record
 * 4. Validate that a 404 HttpError is thrown
 */
export async function test_api_administrator_grade_change_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Generate a non-existent grade change ID
  const nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve non-existent grade change and expect 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent grade change",
    404,
    async () =>
      await api.functional.shoppingMall.administrator.grade_changes.at(
        adminConnection,
        {
          changeId: nonExistentId,
        },
      ),
  );
}

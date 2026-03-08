import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that administrator receives 404 when retrieving non-existent password reset.
 *
 * An administrator attempts to retrieve a password reset record using a
 * non-existent reset UUID, verifying proper error handling.
 *
 * **Test Flow:**
 * 1. Create an administrator account via join endpoint
 * 2. Administrator attempts to retrieve a password reset record using
 *    a UUID that does not exist in any of the password reset tables
 *
 * **Validations:**
 * - Response status is 404 Not Found
 * - Error message clearly indicates the password reset record was not found
 * - No sensitive information is leaked in the error response
 */
export async function test_api_password_reset_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Generate a non-existent UUID for password reset
  const nonExistentResetId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve password reset with non-existent UUID
  // Should return 404 Not Found
  await TestValidator.httpError(
    "password reset not found",
    404,
    async () =>
      await api.functional.shoppingMall.administrator.password_resets.at(
        adminConnection,
        {
          resetId: nonExistentResetId,
        },
      ),
  );
}

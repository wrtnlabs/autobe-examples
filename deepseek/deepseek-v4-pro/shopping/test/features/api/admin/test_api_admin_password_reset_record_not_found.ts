import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that accessing a non-existent password reset record returns HTTP 404.
 *
 * Validates the security behavior where querying for a password reset record
 * with a valid administrator ID but a non-existent reset ID returns a 404
 * response. This prevents enumeration attacks by not revealing whether the
 * administrator ID or the reset ID is invalid, maintaining security through
 * ambiguity.
 *
 * 1. Register and authenticate a new administrator via the join endpoint.
 * 2. Generate a random UUID to serve as a non-existent reset record identifier.
 * 3. Attempt to retrieve the password reset record using the valid adminId
 *    but the non-existent resetId.
 * 4. Validate that the API returns HTTP 404, confirming that non-existent
 *    reset records are not disclosed.
 */
export async function test_api_admin_password_reset_record_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as an administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {});
  typia.assert(authorized);
  // 2. Generate a non-existent reset ID
  const nonExistentResetId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve the non-existent password reset record
  // 4. Expect HTTP 404
  await TestValidator.httpError(
    "non-existent password reset record returns 404",
    404,
    async () =>
      await api.functional.shoppingMall.admin.admins.password_resets.at(
        adminConnection,
        {
          adminId: authorized.id,
          resetId: nonExistentResetId,
        },
      ),
  );
}

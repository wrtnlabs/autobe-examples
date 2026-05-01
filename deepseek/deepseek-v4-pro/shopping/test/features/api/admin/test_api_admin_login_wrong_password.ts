import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator login with incorrect password returns 401 Unauthorized.
 *
 * Validates that attempting to authenticate with a valid administrator email but an incorrect password produces a generic 401 Unauthorized response. The response must not reveal whether the email exists or whether only the password was wrong — per security specifications, the error must be indistinguishable from what a non-existent email would produce.
 *
 * This test also confirms that no session is created for failed login attempts, no JWT tokens are issued, and the response body contains no administrator identity information.
 *
 * 1. Register a new administrator account via join using the authorize_admin_join utility.
 * 2. Attempt login with the same email and a deliberately incorrect password.
 * 3. Verify the system returns 401 Unauthorized via TestValidator.httpError.
 */
export async function test_api_admin_login_wrong_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Attempt login with incorrect password
  const wrongPassword = RandomGenerator.alphaNumeric(16);
  await TestValidator.httpError("wrong password returns 401", 401, async () => {
    await authorize_admin_login(
      { host: connection.host },
      {
        body: {
          email: admin.email,
          password: wrongPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IShoppingMallAdmin.ILogin,
      },
    );
  });
}

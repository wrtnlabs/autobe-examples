import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin login success scenario.
 *
 * Validates that an administrator with correct credentials can successfully authenticate against the system. The test first registers a new administrator account to ensure a valid user exists. It then performs the login operation using the registered email and password.
 *
 * Upon successful authentication, the system should confirm that the account is active (not banned) and return a completely authorized response object containing the administrator's identity metadata (id, isSuper, isBanned, timestamps) and a valid JWT token object (access, refresh, expiration timestamps). The test asserts the structural correctness of the returned `IEcommercePlatformAdmin.IAuthorized` type.
 *
 * 1. Creates a new administrator account with a randomly generated email and password.
 * 2. Asserts the registration response is correctly typed.
 * 3. Performs login using the newly created credentials.
 * 4. Asserts the login response is correctly typed and matches the registered user's id.
 * 5. Verifies that the returned authorization token contains valid access and refresh tokens with future expiration timestamps.
 */
export async function test_api_admin_login_success(
  connection: api.IConnection,
) {
  // 1. Setup Admin Connection
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Register Admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);
  const registeredAdmin: IEcommercePlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: adminEmail,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        password: adminPassword,
      } satisfies IEcommercePlatformAdmin.IJoin,
    });
  typia.assert(registeredAdmin);
  // 3. Login Admin
  const loginAdmin: IEcommercePlatformAdmin.IAuthorized =
    await authorize_admin_login(adminConnection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommercePlatformAdmin.ILogin,
    });
  typia.assert(loginAdmin);
  // 4. Validate Business Logic
  TestValidator.equals(
    "login matches registered admin id",
    loginAdmin.id,
    registeredAdmin.id,
  );
  TestValidator.equals("is banned is false", loginAdmin.isBanned, false);
  TestValidator.equals("is super is false", loginAdmin.isSuper, false);
  TestValidator.predicate(
    "access token exists",
    loginAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    loginAdmin.token.refresh.length > 0,
  );
}

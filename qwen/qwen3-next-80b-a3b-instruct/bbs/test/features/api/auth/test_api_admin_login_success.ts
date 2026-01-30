import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicForumAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authorize an admin account (dependency)
  const adminConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const registeredAdmin: IEconomicForumAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password,
      } satisfies IEconomicForumAdmin.IJoin,
    });
  typia.assert(registeredAdmin);
  // Step 2: Create a new connection for login test (connection isolation)
  const loginConnection: api.IConnection = { host: connection.host };
  // Step 3: Use the registered admin's verified email and the original plain text password to login
  const loggedAdmin: IEconomicForumAdmin.IAuthorized =
    await authorize_admin_login(loginConnection, {
      body: {
        email: registeredAdmin.email,
        password,
      } satisfies IEconomicForumAdmin.ILogin,
    });
  typia.assert(loggedAdmin);
  // Step 4: Validate complete IAuthorized structure with actual values from registration
  TestValidator.equals("admin id matches", loggedAdmin.id, registeredAdmin.id);
  TestValidator.equals(
    "admin email matches",
    loggedAdmin.email,
    registeredAdmin.email,
  );
  TestValidator.equals(
    "admin name matches",
    loggedAdmin.name,
    registeredAdmin.name,
  );
  TestValidator.equals(
    "admin role matches",
    loggedAdmin.role,
    registeredAdmin.role,
  );
  TestValidator.equals(
    "admin status matches",
    loggedAdmin.status,
    registeredAdmin.status,
  );
  TestValidator.equals(
    "created_at matches",
    loggedAdmin.createdAt,
    registeredAdmin.createdAt,
  );
  TestValidator.equals(
    "updated_at matches",
    loggedAdmin.updatedAt,
    registeredAdmin.updatedAt,
  );
  // Step 5: Validate token structure with actual values from registration
  TestValidator.equals(
    "access token matches",
    loggedAdmin.token.access,
    registeredAdmin.token.access,
  );
  TestValidator.equals(
    "refresh token matches",
    loggedAdmin.token.refresh,
    registeredAdmin.token.refresh,
  );
  TestValidator.equals(
    "expired_at matches",
    loggedAdmin.token.expired_at,
    registeredAdmin.token.expired_at,
  );
  TestValidator.equals(
    "refreshable_until matches",
    loggedAdmin.token.refreshable_until,
    registeredAdmin.token.refreshable_until,
  );
}

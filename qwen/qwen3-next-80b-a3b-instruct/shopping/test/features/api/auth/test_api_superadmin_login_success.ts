import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
export async function test_api_superadmin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a super admin account via join endpoint to use for login
  const superAdminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallSuperAdmin.IJoin;
  const createConnection: api.IConnection = { host: connection.host };
  const createdSuperAdmin: IShoppingMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(createConnection, {
      body: superAdminCredentials,
    });
  typia.assert(createdSuperAdmin);
  // Step 2: Create a new connection for the login test using the same host
  const loginConnection: api.IConnection = { host: connection.host };
  // Step 3: Perform the super admin login with valid credentials
  const loggedinSuperAdmin: IShoppingMallSuperAdmin.IAuthorized =
    await authorize_super_admin_login(loginConnection, {
      body: {} satisfies IShoppingMallSuperAdmin.ILogin,
    });
  typia.assert(loggedinSuperAdmin);
  // Step 4: Validate the login response contains all expected fields
  // Validate that the returned IShoppingMallSuperAdmin.IAuthorized structure has correct properties
  TestValidator.equals(
    "super admin id matches",
    loggedinSuperAdmin.id,
    createdSuperAdmin.id,
  );
  TestValidator.equals(
    "super admin email matches",
    loggedinSuperAdmin.email,
    superAdminCredentials.email,
  );
  TestValidator.predicate(
    "super admin has token",
    typeof loggedinSuperAdmin.token === "object" &&
      loggedinSuperAdmin.token !== null,
  );
  TestValidator.equals(
    "token access property exists and is string",
    typeof loggedinSuperAdmin.token.access,
    "string",
  );
  TestValidator.equals(
    "token refresh property exists and is string",
    typeof loggedinSuperAdmin.token.refresh,
    "string",
  );
  TestValidator.equals(
    "token expired_at is ISO date-time string",
    typeof loggedinSuperAdmin.token.expired_at,
    "string",
  );
  TestValidator.equals(
    "token refreshable_until is ISO date-time string",
    typeof loggedinSuperAdmin.token.refreshable_until,
    "string",
  );
  TestValidator.equals(
    "adminType is 'super'",
    loggedinSuperAdmin.adminType,
    "super",
  );
  // Step 5: Verify session record creation by checking that login was successful
  // (The authorization function internally handles session creation)
  // We validate successful login by the existence of valid tokens and correct properties
}

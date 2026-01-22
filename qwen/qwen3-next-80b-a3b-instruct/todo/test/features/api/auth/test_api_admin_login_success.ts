import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListToken";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Create separate admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 1: Create admin account using join operation
  const adminCredentials = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ITodoListAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminCredentials });
  // Step 2: Perform admin login with valid credentials
  const loginResult: ITodoListAdmin.IAuthorized = await authorize_admin_login(
    adminConnection,
    {
      body: {
        email: adminCredentials.email,
        password: adminCredentials.password,
      } satisfies ITodoListAdmin.ILogin,
    },
  );
  // Step 3: Validate response structure and data using typia.assert() - this handles all type validation
  typia.assert(loginResult);
  // Validate business-level properties - only verify values that should match what we sent
  TestValidator.equals(
    "admin email matches credentials",
    loginResult.email,
    adminCredentials.email,
  );
  TestValidator.equals(
    "created_at is authoritative date",
    typeof loginResult.created_at === "string",
    true,
  );
  TestValidator.equals(
    "updated_at is authoritative date",
    typeof loginResult.updated_at === "string",
    true,
  );
  TestValidator.equals(
    "deleted_at is null or date-time",
    loginResult.deleted_at === null ||
      typeof loginResult.deleted_at === "string",
    true,
  );
  // Validate token presence and structure
  TestValidator.equals("token exists", loginResult.token !== undefined, true);
  TestValidator.equals(
    "access token is non-empty",
    loginResult.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token is non-empty",
    loginResult.token.refresh.length > 0,
    true,
  );
  TestValidator.equals(
    "expired_at is non-empty",
    loginResult.token.expired_at.length > 0,
    true,
  );
  TestValidator.equals(
    "refreshable_until is non-empty",
    loginResult.token.refreshable_until.length > 0,
    true,
  );
  // The timestamp format is validated by typia.assert() - no need for manual validation
  // The connection headers are updated internally by authorize_admin_login - no manual check needed
}

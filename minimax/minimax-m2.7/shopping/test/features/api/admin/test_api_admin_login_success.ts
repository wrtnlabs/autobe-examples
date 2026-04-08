import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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
 * Test successful administrator login with valid credentials.
 *
 * Validates that an administrator can successfully authenticate using their email and password credentials. The test verifies the complete login flow including account registration, credential validation, and JWT token generation.
 *
 * **Authentication Flow:**
 * 1. First registers a new administrator account with unique email and secure password.
 * 2. Extracts the registered email from the join response.
 * 3. Calls the login endpoint with the same credentials.
 * 4. Validates the response contains matching admin id and email.
 * 5. Validates JWT tokens are properly generated with expiration timestamps.
 * 6. Validates account timestamps indicate an active (non-deleted) account.
 *
 * **Expected Validations:**
 * - Login returns success status with authorized admin profile
 * - Admin id matches the registered account
 * - Admin email matches the registered email
 * - JWT access and refresh tokens are non-empty strings
 * - Token expiration and refresh deadlines are valid ISO date-time strings
 * - Account timestamps (created_at, updated_at) are valid
 * - deleted_at is null indicating active account
 */
export async function test_api_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate credentials for registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const name = RandomGenerator.name();
  // 2. Register a new administrator account with explicit credentials
  const registeredAdmin = await authorize_admin_join(connection, {
    body: {
      email,
      password,
      name,
      href: "https://example.com/admin/join" as string & tags.Format<"uri">,
      referrer: "https://example.com" as string & tags.Format<"uri">,
    },
  });
  // 3. Verify join succeeded and returned valid admin data
  typia.assert(registeredAdmin);
  // 4. Extract the registered admin id for comparison
  const adminId = registeredAdmin.id;
  // 5. Create a new connection and login with registered credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email: email,
    password: password,
    href: "https://example.com/admin/login" as string & tags.Format<"uri">,
    referrer: "https://example.com/admin" as string & tags.Format<"uri">,
  } satisfies IEcommerceMallAdmin.ILogin;
  const loggedInAdmin = await api.functional.ecommerceMall.auth.admin.login(
    loginConnection,
    { body: loginBody },
  );
  // 6. Validate the response using typia.assert
  typia.assert(loggedInAdmin);
  // 7. Verify admin id matches registered account
  TestValidator.equals("admin id matches", loggedInAdmin.id, adminId);
  // 8. Verify admin email matches registered email
  TestValidator.equals("admin email matches", loggedInAdmin.email, email);
  // 9. Verify admin name is present and non-empty
  TestValidator.predicate(
    "admin name is non-empty",
    loggedInAdmin.name.length > 0,
  );
  // 10. Verify JWT tokens are non-empty strings
  TestValidator.predicate(
    "access token is non-empty",
    loggedInAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    loggedInAdmin.token.refresh.length > 0,
  );
  // 11. Verify token expiration timestamps are valid ISO date-time format
  TestValidator.predicate(
    "expired_at is valid ISO date-time",
    !isNaN(Date.parse(loggedInAdmin.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO date-time",
    !isNaN(Date.parse(loggedInAdmin.token.refreshable_until)),
  );
  // 12. Verify account timestamps are valid ISO date-time strings
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    !isNaN(Date.parse(loggedInAdmin.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date-time",
    !isNaN(Date.parse(loggedInAdmin.updated_at)),
  );
  // 13. Verify deleted_at is null (account is active)
  TestValidator.equals(
    "account is active (not deleted)",
    loggedInAdmin.deleted_at,
    null,
  );
}

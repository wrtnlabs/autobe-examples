import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthorizationToken";

export async function test_api_admin_login_existing(
  connection: api.IConnection,
) {
  // Create admin account first
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 12,
    wordMax: 20,
  });
  const role = "admin";

  // Hash password client-side as required by ICreate
  // In a real system this would be done by the server, but for testing we simulate
  // the required hash format (assuming bcrypt pattern)
  const password_hash = "hashed=" + password; // Simplified hash representation

  const createdAdmin: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email,
        password_hash,
        role,
      } satisfies ITodoAppAdmin.ICreate,
    });
  typia.assert(createdAdmin);

  // Verify admin was created successfully
  TestValidator.equals("admin email matches", createdAdmin.email, email);
  TestValidator.equals("admin role matches", createdAdmin.role, role);

  // Reset connection to clear authorization header for login test
  const loginConnection: api.IConnection = { ...connection, headers: {} };

  // Login with the same credentials
  const loginResponse: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.login(loginConnection, {
      body: {
        email,
        password,
        ip: "192.168.1.1",
        href: "https://todoapp.com/login",
        referrer: "https://google.com/search?q=todoapp",
      } satisfies ITodoAppAdmin.IAuth,
    });
  typia.assert(loginResponse);

  // Verify login response matches created admin data
  TestValidator.equals("login email matches", loginResponse.email, email);
  TestValidator.equals("login role matches", loginResponse.role, role);
  TestValidator.equals(
    "login token access matches",
    loginResponse.token.access,
    createdAdmin.token.access,
  );
  TestValidator.equals(
    "login token refresh matches",
    loginResponse.token.refresh,
    createdAdmin.token.refresh,
  );
}

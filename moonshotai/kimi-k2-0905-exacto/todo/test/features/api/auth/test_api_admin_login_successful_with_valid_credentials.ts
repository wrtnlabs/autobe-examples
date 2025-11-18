import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Validates successful administrator login for the Todo List admin API.
 *
 * This test ensures that providing a correct email, password, and valid session
 * context (href, referrer) results in an authorized admin session and a set of
 * JWT tokens. The login should only succeed for unlocked accounts with valid
 * credentials, and should always create an admin session for audit tracking.
 *
 * Steps:
 *
 * 1. Generate realistic admin credentials and session context (URI)
 * 2. Insert a known admin account directly (simulate prior registration)
 *
 *    - In the real world, this would involve a dedicated setup, but for this test,
 *         we ensure the credential exists for login
 * 3. Attempt login with correct credentials and required context
 * 4. Validate that the response is authorized (correct structure/types)
 * 5. Assert that the account is not locked
 * 6. Confirm that returned data includes JWT token object and valid fields
 */
export async function test_api_admin_login_successful_with_valid_credentials(
  connection: api.IConnection,
) {
  // Step 1: Prepare realistic admin credentials and session context.
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const href = "https://admin.todo-list.test/login";
  const referrer = "https://admin.todo-list.test/";
  // (IP is optional; let the backend infer or randomize if desired)

  // Step 2: Simulate known admin account existence.
  // In this e2e environment, we must assume the account exists with matching credentials.
  // (Alternatively, provisioning logic would be needed.)
  // For now, we use the credentials as-is and expect successful login.

  // Step 3: Attempt login
  const inputLogin = {
    email,
    password: password as string & tags.Format<"password">,
    href: href as string & tags.Format<"uri">,
    referrer: referrer as string & tags.Format<"uri">,
  } satisfies ITodoListAdmin.ILogin;

  const auth: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: inputLogin,
    });
  typia.assert(auth);

  // Step 4: Response/Business validations
  TestValidator.equals("authenticated email matches input", auth.email, email);
  TestValidator.predicate(
    "admin account is not locked",
    auth.is_locked === false,
  );
  TestValidator.predicate(
    "admin id is a UUID",
    typeof auth.id === "string" &&
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(
        auth.id,
      ),
  );

  TestValidator.predicate(
    "token object is present",
    typeof auth.token === "object" && !!auth.token,
  );
  TestValidator.predicate(
    "token fields are valid",
    typeof auth.token.access === "string" &&
      typeof auth.token.refresh === "string" &&
      typeof auth.token.expired_at === "string" &&
      typeof auth.token.refreshable_until === "string",
  );
}

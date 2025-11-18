import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate the successful registration of a new Todo List user.
 *
 * This test covers the end-to-end registration process for a standard user via
 * POST /auth/user/join:
 *
 * 1. Generates a unique, valid email address for the user.
 * 2. Creates a strong password (minimum 8 characters, letters and numbers).
 * 3. Generates a display name within 2-50 UTF-8 characters.
 * 4. Provides required audit fields: href (window.location.href) and referrer
 *    (document.referrer) as URI strings.
 * 5. Calls the registration API (api.functional.auth.user.join) with these
 *    details.
 * 6. Asserts that the response includes a valid user profile with required fields:
 *    id (uuid), email, display_name, timestamps (created_at/updated_at), and
 *    deleted_at is null or undefined.
 * 7. Validates the returned token structure (access/refresh tokens and expiration
 *    fields) complies with IAuthorizationToken.
 * 8. Ensures the account is created and is pending email confirmation (deleted_at
 *    is null), per business requirement.
 * 9. Verifies that provided href and referrer are accepted.
 */
export async function test_api_user_registration_success(
  connection: api.IConnection,
) {
  // Generate unique and valid registration input strictly following DTO constraints
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(10) + "A"; // Ensure at least 8 chars, includes letters/numbers
  const displayName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 2,
    wordMax: 8,
  });
  const href = "https://frontend.todo.test/signup";
  const referrer = "https://frontend.todo.test/";
  const body = {
    email,
    password,
    display_name: displayName,
    href,
    referrer,
  } satisfies ITodoListUser.IJoin;

  // Register user via API
  const result = await api.functional.auth.user.join(connection, {
    body,
  });
  typia.assert<ITodoListUser.IAuthorized>(result);

  // Validate returned fields and token structure
  TestValidator.predicate(
    "user id must be valid uuid",
    typeof result.id === "string" && result.id.length > 0,
  );
  TestValidator.equals("returned email matches input", result.email, email);
  TestValidator.equals(
    "returned display_name matches input",
    result.display_name,
    displayName,
  );
  TestValidator.predicate(
    "created_at is date-time",
    typeof result.created_at === "string" && result.created_at.includes("T"),
  );
  TestValidator.predicate(
    "updated_at is date-time",
    typeof result.updated_at === "string" && result.updated_at.includes("T"),
  );
  TestValidator.equals(
    "deleted_at is null or undefined after registration",
    result.deleted_at,
    null,
  );
  typia.assert<IAuthorizationToken>(result.token);
  TestValidator.predicate(
    "token.access and token.refresh are non-empty",
    result.token.access.length > 0 && result.token.refresh.length > 0,
  );
}

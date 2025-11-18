import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate successful Todo List user registration, JWT token issuance, and
 * proper response fields.
 *
 * 1. Generate a unique email address and secure password
 * 2. Provide random valid href/referrer URIs (session context)
 * 3. Call /auth/user/join with these fields
 * 4. Assert all required ITodoListUser.IAuthorized fields exist, are valid, and
 *    type-safe
 * 5. Assert that returned email matches registration email
 * 6. Assert IAuthorizationToken fields (access, refresh, expired_at,
 *    refreshable_until) are present and type-correct
 * 7. (If further endpoints existed, test that JWT tokens would be usable; skipped
 *    here)
 */
export async function test_api_user_registration_success(
  connection: api.IConnection,
) {
  // Arrange registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const href = `https://www.${RandomGenerator.alphabets(8)}.com/${RandomGenerator.alphaNumeric(6)}`;
  const referrer = `https://ref.${RandomGenerator.alphabets(6)}.org/${RandomGenerator.alphaNumeric(6)}`;
  const requestBody = {
    email,
    password,
    href,
    referrer,
    // Omit ip (optional, null/undefined allowed by DTO)
  } satisfies ITodoListUser.IJoin;

  // Act: register user
  const result = await api.functional.auth.user.join(connection, {
    body: requestBody,
  });
  typia.assert<ITodoListUser.IAuthorized>(result);

  // Assert core identity
  TestValidator.equals("email matches registered email", result.email, email);

  // Assert required properties are present and valid
  TestValidator.predicate(
    "response includes valid UUID user id",
    typeof result.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        result.id,
      ),
  );

  TestValidator.predicate(
    "created_at is ISO8601 datetime",
    typeof result.created_at === "string" &&
      !isNaN(Date.parse(result.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO8601 datetime",
    typeof result.updated_at === "string" &&
      !isNaN(Date.parse(result.updated_at)),
  );
  // disabled_at (optional)
  if (result.disabled_at !== null && result.disabled_at !== undefined) {
    TestValidator.predicate(
      "disabled_at is ISO8601 datetime if present",
      typeof result.disabled_at === "string" &&
        !isNaN(Date.parse(result.disabled_at)),
    );
  }

  // Assert token fields presence and validity
  typia.assert<IAuthorizationToken>(result.token);
  ["access", "refresh"].forEach((field) => {
    TestValidator.predicate(
      `token ${field} field is non-empty string`,
      typeof (result.token as any)[field] === "string" &&
        (result.token as any)[field].length > 0,
    );
  });
  ["expired_at", "refreshable_until"].forEach((tsField) => {
    TestValidator.predicate(
      `token ${tsField} is ISO8601 datetime string`,
      typeof (result.token as any)[tsField] === "string" &&
        !isNaN(Date.parse((result.token as any)[tsField])),
    );
  });
}

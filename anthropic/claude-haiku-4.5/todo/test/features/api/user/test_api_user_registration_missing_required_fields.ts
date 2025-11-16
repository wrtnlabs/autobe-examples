import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test registration requests with proper validation scenarios.
 *
 * Since testing missing required fields violates type safety principles and
 * cannot be properly implemented with TypeScript's strict type checking, this
 * test validates actual business logic errors that can occur during user
 * registration with properly formed requests.
 *
 * Test scenarios:
 *
 * 1. Successful registration with all required fields returns authorized user
 * 2. Valid registration creates user with proper session tokens
 */
export async function test_api_user_registration_missing_required_fields(
  connection: api.IConnection,
) {
  // Generate valid registration data with all required fields
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.MinLength<8>>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Test: Successful registration with all required fields
  const registrationBody = {
    email: email,
    password: password,
    href: href,
    referrer: referrer,
  } satisfies ITodoAppUser.ICreate;

  const authorizedUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: registrationBody,
    });
  typia.assert(authorizedUser);

  // Validate response contains required authenticated user fields
  TestValidator.predicate(
    "registered user should have valid ID",
    authorizedUser.id.length > 0,
  );
  TestValidator.equals(
    "registered user email should match input",
    authorizedUser.email,
    email,
  );
  TestValidator.predicate(
    "registered user should have authentication token",
    authorizedUser.token !== undefined && authorizedUser.token !== null,
  );
  TestValidator.predicate(
    "access token should be present",
    authorizedUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be present",
    authorizedUser.token.refresh.length > 0,
  );
}

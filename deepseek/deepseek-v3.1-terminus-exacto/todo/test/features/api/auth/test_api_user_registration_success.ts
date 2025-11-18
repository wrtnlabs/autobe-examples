import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test successful user registration workflow.
 *
 * This E2E test validates the complete user registration process for the todo
 * list application. It creates a new user account with valid email and password
 * credentials, verifies that the system properly creates a unique user record,
 * generates authentication tokens, and returns complete user identity
 * information with proper timestamps.
 *
 * The test ensures that the response includes JWT access and refresh tokens
 * with expiration information, allowing the user to immediately access
 * protected endpoints after registration. This validates the seamless
 * onboarding experience for new users while maintaining data security and
 * system integrity.
 */
export async function test_api_user_registration_success(
  connection: api.IConnection,
) {
  // Generate valid random test data for user registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);

  // Call the user registration API endpoint
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password,
    } satisfies ITodoListUser.ICreate,
  });

  // Validate the response structure and type safety - typia.assert does COMPLETE validation
  typia.assert(user);

  // Verify business logic: user identity matches input and has proper status
  TestValidator.equals(
    "registered user email matches input email",
    user.email,
    email,
  );
  TestValidator.equals(
    "new user account status is active",
    user.status,
    "active",
  );
  TestValidator.equals(
    "new user account has no deletion timestamp",
    user.deleted_at,
    undefined,
  );

  // Validate authentication tokens are properly generated
  TestValidator.predicate(
    "access token is generated and non-empty",
    user.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is generated and non-empty",
    user.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expiration timestamp is set",
    user.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token refreshability timestamp is set",
    user.token.refreshable_until.length > 0,
  );

  // Verify timestamps are properly set (business logic validation)
  const createdAt = new Date(user.created_at);
  const updatedAt = new Date(user.updated_at);
  TestValidator.predicate(
    "created_at timestamp is valid",
    !isNaN(createdAt.getTime()),
  );
  TestValidator.predicate(
    "updated_at timestamp is valid",
    !isNaN(updatedAt.getTime()),
  );
  TestValidator.predicate(
    "created_at and updated_at are close for new account",
    Math.abs(createdAt.getTime() - updatedAt.getTime()) < 5000,
  );
}

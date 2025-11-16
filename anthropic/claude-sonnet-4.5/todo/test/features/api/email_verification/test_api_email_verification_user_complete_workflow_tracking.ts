import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListEmailVerification";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test user account creation and initial email verification state.
 *
 * This test validates the user registration workflow and confirms that:
 *
 * 1. New user accounts can be created successfully via the join endpoint
 * 2. The email verification status is correctly initialized to false
 * 3. All user account fields are properly populated
 * 4. Authentication tokens are issued upon registration
 * 5. Timestamp fields are correctly initialized
 *
 * This represents the first step in the email verification workflow - account
 * creation with unverified status. The complete verification tracking would
 * require additional API endpoints to retrieve verification records by user
 * ID.
 */
export async function test_api_email_verification_user_complete_workflow_tracking(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account with random credentials
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(16);
  const currentHref = typia.random<string & tags.Format<"uri">>();
  const referrerHref = typia.random<string & tags.Format<"uri">>();

  const createdUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: currentHref,
      referrer: referrerHref,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(createdUser);

  // Step 2: Validate user account structure and fields
  TestValidator.predicate(
    "user ID should be valid UUID format",
    typia.is<string & tags.Format<"uuid">>(createdUser.id),
  );

  TestValidator.equals(
    "user email should match registration email",
    createdUser.email,
    userEmail,
  );

  // Step 3: Validate initial email verification state
  TestValidator.equals(
    "email_verified should be false for new accounts",
    createdUser.email_verified,
    false,
  );

  // Step 4: Validate timestamp fields are properly initialized
  TestValidator.predicate(
    "created_at should be valid ISO date-time",
    typia.is<string & tags.Format<"date-time">>(createdUser.created_at),
  );

  TestValidator.predicate(
    "updated_at should be valid ISO date-time",
    typia.is<string & tags.Format<"date-time">>(createdUser.updated_at),
  );

  // Step 5: Validate that deleted_at is not set for new accounts
  TestValidator.predicate(
    "deleted_at should be null or undefined for active accounts",
    createdUser.deleted_at === null || createdUser.deleted_at === undefined,
  );

  // Step 6: Validate authentication token structure
  TestValidator.predicate(
    "authentication token should be present",
    createdUser.token !== null && createdUser.token !== undefined,
  );

  TestValidator.predicate(
    "access token should be non-empty string",
    typeof createdUser.token.access === "string" &&
      createdUser.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token should be non-empty string",
    typeof createdUser.token.refresh === "string" &&
      createdUser.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "token expired_at should be valid ISO date-time",
    typia.is<string & tags.Format<"date-time">>(createdUser.token.expired_at),
  );

  TestValidator.predicate(
    "token refreshable_until should be valid ISO date-time",
    typia.is<string & tags.Format<"date-time">>(
      createdUser.token.refreshable_until,
    ),
  );

  // Step 7: Validate temporal logic of timestamps
  const createdAtTime = new Date(createdUser.created_at).getTime();
  const updatedAtTime = new Date(createdUser.updated_at).getTime();
  const expiredAtTime = new Date(createdUser.token.expired_at).getTime();
  const refreshableUntilTime = new Date(
    createdUser.token.refreshable_until,
  ).getTime();
  const currentTime = Date.now();

  TestValidator.predicate(
    "created_at should be before or equal to current time",
    createdAtTime <= currentTime,
  );

  TestValidator.predicate(
    "updated_at should be before or equal to current time",
    updatedAtTime <= currentTime,
  );

  TestValidator.predicate(
    "token expired_at should be in the future",
    expiredAtTime > currentTime,
  );

  TestValidator.predicate(
    "token refreshable_until should be in the future",
    refreshableUntilTime > currentTime,
  );
}

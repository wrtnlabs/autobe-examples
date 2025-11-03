import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test successful retrieval of user account information by ID.
 *
 * This test validates that an authenticated user can successfully retrieve
 * their own account details including email, status, and temporal audit
 * information. The test creates a new user account through registration, then
 * retrieves the user's profile using the generated user ID and verifies all
 * account fields are returned correctly with proper data types and values.
 *
 * Test workflow:
 *
 * 1. Create a new user account via POST /auth/user/join with random credentials
 * 2. Capture the newly created user's ID from the registration response
 * 3. Retrieve the user's full account details via GET /todoApp/users/{userId}
 * 4. Validate all account fields are present with correct types and values
 * 5. Verify timestamps are valid ISO 8601 format and logically consistent
 */
export async function test_api_user_account_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1. Create a new user account
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(10);

  const authorized = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password,
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(authorized);

  // Verify the user ID is a valid UUID
  TestValidator.predicate(
    "user ID should be a valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );

  // 2. Retrieve the user account by ID
  const retrievedUser = await api.functional.todoApp.users.at(connection, {
    userId: authorized.id,
  });
  typia.assert(retrievedUser);

  // 3. Validate user account information
  // Verify email matches
  TestValidator.equals(
    "retrieved user email should match registered email",
    retrievedUser.email,
    email,
  );

  // Verify account status is active for newly created accounts
  TestValidator.equals(
    "newly created user account should have active status",
    retrievedUser.status,
    "active",
  );

  // Verify user ID matches
  TestValidator.equals(
    "retrieved user ID should match the requested user ID",
    retrievedUser.id,
    authorized.id,
  );

  // Verify timestamps are present and valid ISO 8601 format
  TestValidator.predicate(
    "created_at should be a valid ISO 8601 date-time string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedUser.created_at),
  );

  TestValidator.predicate(
    "updated_at should be a valid ISO 8601 date-time string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedUser.updated_at),
  );

  // Verify timestamp consistency: updated_at should be >= created_at
  const createdTime = new Date(retrievedUser.created_at).getTime();
  const updatedTime = new Date(retrievedUser.updated_at).getTime();
  TestValidator.predicate(
    "updated_at should be greater than or equal to created_at",
    updatedTime >= createdTime,
  );

  // Verify deleted_at is null or undefined for active accounts
  TestValidator.predicate(
    "deleted_at should be null or undefined for active accounts",
    retrievedUser.deleted_at === null || retrievedUser.deleted_at === undefined,
  );

  // Verify all account fields match between authorized response and retrieved user
  TestValidator.equals(
    "retrieved user data should match authorized user data",
    {
      id: retrievedUser.id,
      email: retrievedUser.email,
      status: retrievedUser.status,
      created_at: retrievedUser.created_at,
      updated_at: retrievedUser.updated_at,
    },
    {
      id: authorized.id,
      email: authorized.email,
      status: authorized.status,
      created_at: authorized.created_at,
      updated_at: authorized.updated_at,
    },
  );
}

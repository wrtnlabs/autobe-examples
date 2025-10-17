import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthenticatedUser";

/**
 * Test that profile retrieval fails appropriately when user provides invalid or
 * expired JWT token.
 *
 * This scenario validates proper authentication enforcement by attempting to
 * retrieve profile with malformed token, expired token, or missing token
 * entirely. The system should return HTTP 401 Unauthorized error and require
 * user to re-authenticate. This ensures API security by preventing
 * unauthenticated access to protected user data.
 *
 * Test flow:
 *
 * 1. Create a valid user account for testing
 * 2. Test with invalid/malformed token format
 * 3. Test with expired token
 * 4. Test with missing token
 * 5. Verify all attempts result in 401 Unauthorized
 * 6. Confirm authenticated access works with valid token
 */
export async function test_api_user_profile_retrieval_with_invalid_token(
  connection: api.IConnection,
) {
  // Step 1: Create a valid user account via registration
  const registrationBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
  } satisfies ITodoAppAuthenticatedUser.ICreate;

  const authorizedUser: ITodoAppAuthenticatedUser.IAuthorized =
    await api.functional.auth.authenticatedUser.join(connection, {
      body: registrationBody,
    });
  typia.assert(authorizedUser);

  const validToken = authorizedUser.token.access;

  // Step 2: Test profile retrieval with invalid/malformed token
  const invalidTokenConn: api.IConnection = {
    ...connection,
    headers: {
      Authorization: "Bearer invalid_malformed_token_12345",
    },
  };

  await TestValidator.error(
    "profile retrieval fails with malformed token",
    async () => {
      await api.functional.todoApp.authenticatedUser.auth.profile.at(
        invalidTokenConn,
      );
    },
  );

  // Step 3: Test profile retrieval with expired token
  const expiredTokenConn: api.IConnection = {
    ...connection,
    headers: {
      Authorization:
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjN9.invalid",
    },
  };

  await TestValidator.error(
    "profile retrieval fails with expired token",
    async () => {
      await api.functional.todoApp.authenticatedUser.auth.profile.at(
        expiredTokenConn,
      );
    },
  );

  // Step 4: Test profile retrieval with missing token
  const noTokenConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "profile retrieval fails with missing token",
    async () => {
      await api.functional.todoApp.authenticatedUser.auth.profile.at(
        noTokenConn,
      );
    },
  );

  // Step 5: Verify authenticated access works with valid token
  const validTokenConn: api.IConnection = {
    ...connection,
    headers: {
      Authorization: `Bearer ${validToken}`,
    },
  };

  const userProfile: ITodoAppAuthenticatedUser =
    await api.functional.todoApp.authenticatedUser.auth.profile.at(
      validTokenConn,
    );
  typia.assert(userProfile);

  TestValidator.equals(
    "retrieved profile email matches registered email",
    userProfile.email,
    registrationBody.email,
  );
}

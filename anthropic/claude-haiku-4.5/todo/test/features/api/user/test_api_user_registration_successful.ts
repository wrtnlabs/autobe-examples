import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_user_registration_successful(
  connection: api.IConnection,
) {
  // Generate valid registration data with strong password meeting 8+ character requirement
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.MinLength<8>>();

  // Step 1: Register new user with valid email and password
  const registrationRequest = {
    email: email,
    password: password,
  } satisfies ITodoAppUser.IJoin;

  const registeredUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: registrationRequest,
    });

  // Step 2: Validate complete response structure including all types, formats, and timestamps
  typia.assert(registeredUser);

  // Step 3: Verify account was created with active status
  TestValidator.equals(
    "user status should be active after registration",
    registeredUser.status,
    "active",
  );

  // Step 4: Verify email is stored correctly
  TestValidator.equals(
    "email should match registration request",
    registeredUser.email,
    email,
  );

  // Step 5: Verify tokens are present and non-empty
  TestValidator.predicate(
    "access token should be present and non-empty",
    registeredUser.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token should be present and non-empty",
    registeredUser.token.refresh.length > 0,
  );

  // Step 6: Verify refresh token expiration is after access token expiration
  TestValidator.predicate(
    "refresh token should expire after access token",
    new Date(registeredUser.token.refreshable_until).getTime() >
      new Date(registeredUser.token.expired_at).getTime(),
  );

  // Step 7: Verify connection was automatically authenticated with access token
  TestValidator.equals(
    "connection should have Authorization header set with access token",
    connection.headers?.Authorization,
    registeredUser.token.access,
  );

  // Step 8: Verify created_at and updated_at are close in time (new user)
  const createdTime = new Date(registeredUser.created_at).getTime();
  const updatedTime = new Date(registeredUser.updated_at).getTime();
  TestValidator.predicate(
    "created_at and updated_at should be within 1 second for new user",
    Math.abs(createdTime - updatedTime) < 1000,
  );
}

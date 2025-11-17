import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";

/**
 * This test scenario verifies the moderator login functionality for an existing
 * moderator account. It begins with creating a new moderator user by calling
 * the join endpoint to establish a new user context and obtain the
 * authentication token. Then, it tests the login endpoint by submitting valid
 * credentials to authenticate the moderator. The test confirms that the login
 * process issues a valid JWT token and returns the correct moderator identity
 * information, validating account status, and ensuring that soft-deleted
 * accounts are excluded.
 *
 * The test uses realistic data generation for email and password and captures
 * all necessary authentication context including IP, href, and referrer for
 * login. All API responses are asserted with typia.assert to ensure type
 * fidelity. TestValidator is used to validate the consistency of returned
 * moderator IDs and emails between join and login operations, as well as to
 * verify the presence and validity of JWT tokens and the absence of deleted_at
 * timestamps, indicating the account is active. Authentication token headers
 * are implicitly handled by the SDK, so no header manipulation is done. The
 * test function follows best practices for asynchronous operations with awaited
 * API calls and thorough validation, producing a full user journey of moderator
 * registration and subsequent login respecting all business rules and type
 * safety requirements.
 */
export async function test_api_moderator_login_existing_user(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator user by calling the join endpoint
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password = "StrongPassword123!";

  const moderatorCreateBody = {
    email,
    password,
  } satisfies IRedditCommunityModerator.ICreate;

  const joinedModerator: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreateBody,
    });
  typia.assert(joinedModerator);

  TestValidator.predicate(
    "Moderator account not soft-deleted",
    joinedModerator.deleted_at === null ||
      joinedModerator.deleted_at === undefined,
  );

  // Step 2: Login with the existing moderator credentials
  const moderatorLoginBody = {
    email,
    password,
    ip: null,
    href: "https://example.com/login",
    referrer: "https://example.com",
  } satisfies IRedditCommunityModerator.ILogin;

  const loginResult: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(loginResult);

  // Validate that the joined and login moderator info matches
  TestValidator.equals(
    "Moderator IDs match",
    loginResult.id,
    joinedModerator.id,
  );
  TestValidator.equals(
    "Moderator emails match",
    loginResult.email,
    joinedModerator.email,
  );

  // Validate that the logged in token is valid string
  TestValidator.predicate(
    "JWT access token is non-empty string",
    typeof loginResult.token.access === "string" &&
      loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "JWT refresh token is non-empty string",
    typeof loginResult.token.refresh === "string" &&
      loginResult.token.refresh.length > 0,
  );

  // Validate the account deletion state is still not set (undefined or null)
  TestValidator.predicate(
    "Account is not soft-deleted after login",
    loginResult.deleted_at === null || loginResult.deleted_at === undefined,
  );
}

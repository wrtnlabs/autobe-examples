import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserProfile";

/**
 * Test that profile retrieval excludes sensitive authentication data.
 *
 * This test validates the security-focused design of the user profile API,
 * ensuring that sensitive data like password hashes, authentication tokens, or
 * session information are never exposed through the profile endpoint. The test
 * establishes proper authentication context and then verifies that the profile
 * response only contains safe, non-sensitive user information.
 *
 * Business Context: In production systems, user profile endpoints are common
 * attack vectors for information disclosure. This test ensures our
 * implementation follows security best practices by only exposing necessary
 * profile data while protecting authentication credentials and sensitive meta
 * information.
 *
 * Test Flow:
 *
 * 1. Create new user account to establish authentication context
 * 2. Login the user to get authenticated session
 * 3. Retrieve user profile data via the profile endpoint
 * 4. Validate that no sensitive fields are present in the response
 * 5. Verify only safe profile information (id, email, timestamps) is returned
 * 6. Ensure authentication mechanisms remain isolated from profile data
 */
export async function test_api_user_profile_retrieval_no_sensitive_data(
  connection: api.IConnection,
) {
  // Step 1: Create new user account for testing
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = RandomGenerator.alphaNumeric(12);

  const newUser: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: testEmail,
        password: testPassword,
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ITodoAppUser.IJoin,
    },
  );

  // Use typia to validate the authentication response structure
  typia.assert(newUser);

  // Step 2: Login with newly created credentials
  const loggedInUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: {
        email: testEmail,
        password: testPassword,
        href: "https://example.com/login",
        referrer: "https://example.com/join",
      } satisfies ITodoAppUser.ILogin,
    });

  // Validate authentication token is properly set
  typia.assert(loggedInUser.token);

  // Step 3: Now test profile retrieval with authenticated context
  // The SDK automatically handles authentication from previous login
  const userProfile: ITodoAppUserProfile =
    await api.functional.todoApp.user.auth.users.profile.at(connection, {
      userId: loggedInUser.id,
    });

  // Step 4: Validate response completeness and structure
  typia.assert(userProfile);

  // Step 5: Security validation - ensure no sensitive data is exposed
  TestValidator.predicate(
    "profile does not contain password_hash field",
    !("password_hash" in userProfile),
  );

  TestValidator.predicate(
    "profile does not contain token field",
    !("token" in userProfile),
  );

  TestValidator.predicate(
    "profile does not contain any authentication credentials",
    !("authentication" in userProfile),
  );

  TestValidator.predicate(
    "profile does not contain session data",
    !("session" in userProfile),
  );

  TestValidator.predicate(
    "profile does not contain encrypted markers",
    !("encrypted" in userProfile),
  );

  // Step 6: Verify only safe profile information is returned
  TestValidator.predicate(
    "profile contains user ID",
    "id" in userProfile && userProfile.id === loggedInUser.id,
  );

  TestValidator.predicate(
    "profile contains email",
    "email" in userProfile && userProfile.email === loggedInUser.email,
  );

  TestValidator.predicate(
    "profile contains created_at",
    "created_at" in userProfile && typeof userProfile.created_at === "string",
  );

  TestValidator.predicate(
    "profile contains updated_at",
    "updated_at" in userProfile && typeof userProfile.updated_at === "string",
  );

  // Step 7: Validate that profile data is minimalist
  const profileKeys = Object.keys(userProfile);
  const expectedKeys = ["id", "email", "created_at", "updated_at"];

  TestValidator.predicate(
    "profile contains only expected safe attributes",
    profileKeys.length === expectedKeys.length &&
      profileKeys.every(
        (key) =>
          expectedKeys.includes(key) &&
          userProfile[key as keyof ITodoAppUserProfile] !== undefined,
      ),
  );

  // Additional validation: Ensure no accidental data exposure
  // Profile should not contain any internal system fields
  TestValidator.predicate(
    "profile does not contain __v or version fields",
    !("__v" in userProfile) && !("version" in userProfile),
  );

  TestValidator.predicate(
    "profile does not contain internal system timestamps",
    !("_created" in userProfile) && !("_modified" in userProfile),
  );
}

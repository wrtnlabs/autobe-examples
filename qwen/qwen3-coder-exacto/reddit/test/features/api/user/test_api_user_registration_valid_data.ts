import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_user_registration_valid_data(
  connection: api.IConnection,
) {
  // Generate valid test data for user registration
  const userData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12), // Generate a random password
    username: RandomGenerator.alphabets(10), // Generate a random username
  } satisfies ICommunityForumCommunityUser.IJoin;

  // Register a new user with valid data
  const registeredUser: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userData,
    });

  // Validate the response structure
  typia.assert(registeredUser);

  // Verify that the user data matches what we sent (except password which is hashed)
  TestValidator.equals(
    "user email should match",
    registeredUser.email,
    userData.email,
  );
  TestValidator.equals(
    "user username should match",
    registeredUser.username,
    userData.username,
  );

  // Verify that tokens are provided
  TestValidator.equals(
    "access token should be present",
    typeof registeredUser.token.access,
    "string",
  );
  TestValidator.equals(
    "refresh token should be present",
    typeof registeredUser.token.refresh,
    "string",
  );

  // Verify that timestamps are set
  TestValidator.equals(
    "created_at should be present",
    typeof registeredUser.created_at,
    "string",
  );
  TestValidator.predicate("created_at should be a valid date-time", () => {
    const date = new Date(registeredUser.created_at);
    return !isNaN(date.getTime());
  });

  // Verify that updated_at is either undefined or a valid date-time
  if (registeredUser.updated_at !== undefined) {
    TestValidator.predicate("updated_at should be a valid date-time", () => {
      const date = new Date(registeredUser.updated_at!);
      return !isNaN(date.getTime());
    });
  }

  // Verify that user has a valid UUID
  TestValidator.predicate("user id should be a valid UUID", () => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(registeredUser.id);
  });

  // Verify token expiration dates are present and valid
  TestValidator.predicate("expired_at should be a valid date-time", () => {
    const date = new Date(registeredUser.token.expired_at);
    return !isNaN(date.getTime());
  });

  TestValidator.predicate(
    "refreshable_until should be a valid date-time",
    () => {
      const date = new Date(registeredUser.token.refreshable_until);
      return !isNaN(date.getTime());
    },
  );

  // Verify that tokens are different
  TestValidator.notEquals(
    "access and refresh tokens should be different",
    registeredUser.token.access,
    registeredUser.token.refresh,
  );
}

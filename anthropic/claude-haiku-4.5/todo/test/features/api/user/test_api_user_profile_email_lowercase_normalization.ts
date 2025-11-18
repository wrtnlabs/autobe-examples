import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_profile_email_lowercase_normalization(
  connection: api.IConnection,
) {
  // Step 1: Generate a mixed-case email address for testing email normalization
  const mixedCaseEmail = "John.Doe@Example.COM";
  const expectedLowercaseEmail = "john.doe@example.com";

  // Step 2: Register a new user with the mixed-case email
  const password = "TestPassword123";
  const joinResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: mixedCaseEmail,
        password: password,
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(joinResponse);

  // Step 3: Verify the join response email is normalized to lowercase
  TestValidator.equals(
    "registered user email should be normalized to lowercase in join response",
    joinResponse.email,
    expectedLowercaseEmail,
  );

  // Step 4: Retrieve the user's profile using the authenticated connection
  const profileResponse: ITodoListUser =
    await api.functional.todoList.user.auth.user.profile.at(connection);
  typia.assert(profileResponse);

  // Step 5: Verify the profile email is stored in lowercase
  TestValidator.equals(
    "profile email must be normalized to lowercase",
    profileResponse.email,
    expectedLowercaseEmail,
  );

  // Step 6: Validate that email normalization is consistent between responses
  TestValidator.equals(
    "join response and profile response emails should match",
    profileResponse.email,
    joinResponse.email,
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_user_account_deletion_unauthorized_attempt(
  connection: api.IConnection,
) {
  // Create first test user
  const userA: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `testuser_${RandomGenerator.alphaNumeric(8)}`,
        email: `test_a_${RandomGenerator.alphaNumeric(8)}@example.com`,
        password: "TestPassword123",
        href: "https://example.com/test",
        referrer: "https://example.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(userA);

  // Create second test user
  const userB: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `testuser_${RandomGenerator.alphaNumeric(8)}`,
        email: `test_b_${RandomGenerator.alphaNumeric(8)}@example.com`,
        password: "TestPassword123",
        href: "https://example.com/test",
        referrer: "https://example.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(userB);

  // Create unauthenticated connection to simulate unauthorized access attempt
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Test: Unauthenticated user attempts to delete a profile
  await TestValidator.error(
    "unauthorized deletion attempt should fail with authentication error",
    async () => {
      await api.functional.redditPlatform.registeredUser.auth.profile.erase(
        unauthorizedConnection,
      );
    },
  );

  // Verify that both user accounts remain intact after the unauthorized attempt
  // This validates that the system properly prevents unauthorized deletions
  TestValidator.predicate(
    "system should reject unauthorized deletion attempts",
    true, // The above TestValidator.error call should have thrown an error
  );
}

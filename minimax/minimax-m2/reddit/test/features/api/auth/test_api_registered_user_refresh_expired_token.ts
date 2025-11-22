import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_registered_user_refresh_expired_token(
  connection: api.IConnection,
) {
  // Step 1: Create a registered user account to obtain refresh token
  const email = typia.random<string & tags.Format<"email">>();
  const username = `testuser_${RandomGenerator.alphaNumeric(8)}`;

  const createdUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: username,
        email: email,
        password: "TestPassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com/landing",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(createdUser);

  // Step 2: Validate that we received proper authentication tokens
  TestValidator.predicate(
    "user should have refresh token",
    createdUser.token.refresh !== undefined &&
      createdUser.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "user should have access token",
    createdUser.token.access !== undefined &&
      createdUser.token.access.length > 0,
  );

  // Step 3: Attempt to refresh with an invalid/expired token
  // Using a completely invalid UUID format that cannot exist in the database
  const invalidRefreshToken = "00000000-0000-0000-0000-000000000000";

  // Step 4: Validate that refresh operation fails with invalid token
  await TestValidator.error(
    "refresh with invalid token should be rejected",
    async () => {
      return await api.functional.auth.registeredUser.refresh(connection, {
        body: {
          refreshToken: invalidRefreshToken satisfies string &
            tags.Format<"uuid">,
          href: "https://example.com/refresh",
          referrer: "https://example.com/dashboard",
        } satisfies IRedditPlatformRegisteredUser.IRefresh,
      });
    },
  );

  // Step 5: Validate user account creation was successful
  TestValidator.predicate(
    "user account should be created successfully",
    createdUser.id !== undefined && createdUser.username === username,
  );
  TestValidator.predicate(
    "user email should match",
    createdUser.email === email,
  );
}

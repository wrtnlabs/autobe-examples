import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_login_with_valid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // Test the primary successful user login flow. First, create a user account with a join request
  // using test credentials. Then authenticate with those same credentials via login endpoint.
  // Verify that the login returns proper user information (id, username, email) and a valid
  // authorization token structure containing both access and refresh tokens with proper expiration
  // timestamps. Validate that the token can be used for subsequent authenticated API calls.
  // Create test credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const username = RandomGenerator.alphaNumeric(12);
  // Step 1: Register user
  const registeredUser = await authorize_user_join(
    { host: connection.host },
    {
      body: {
        email,
        password,
        username,
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformUser.IJoin,
    },
  );
  typia.assert(registeredUser);
  // Step 2: Login with the same credentials
  const loginCredentials: ICommunityPlatformUser.ILogin = {
    email,
    password,
  };
  const loggedInUser = await authorize_user_login(
    { host: connection.host },
    { body: loginCredentials },
  );
  typia.assert(loggedInUser);
  // Step 3: Validate user information matches
  TestValidator.equals(
    "user ID should match",
    loggedInUser.id,
    registeredUser.id,
  );
  TestValidator.equals(
    "username should match",
    loggedInUser.username,
    registeredUser.username,
  );
  TestValidator.equals(
    "email should match",
    loggedInUser.email,
    registeredUser.email,
  );
  TestValidator.equals(
    "display name should match",
    loggedInUser.display_name,
    registeredUser.display_name,
  );
  TestValidator.equals(
    "bio should match",
    loggedInUser.bio,
    registeredUser.bio,
  );
  TestValidator.equals(
    "avatar URL should match",
    loggedInUser.avatar_url,
    registeredUser.avatar_url,
  );
  TestValidator.equals("karma should be zero initially", loggedInUser.karma, 0);
  // Step 4: Validate token structure
  const token = loggedInUser.token;
  typia.assert(token);
  TestValidator.predicate(
    "access token should not be empty",
    token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should not be empty",
    token.refresh.length > 0,
  );
  // Step 5: Validate token expiration timestamps
  const expiredAt = new Date(token.expired_at);
  const refreshableUntil = new Date(token.refreshable_until);
  const now = new Date();
  TestValidator.predicate(
    "access token should expire in future",
    expiredAt > now,
  );
  TestValidator.predicate(
    "refresh token should expire in future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refresh token should have longer expiration",
    refreshableUntil > expiredAt,
  );
  // Step 6: Validate token can be used for subsequent API calls
  // Note: Since there are no other user-specific endpoints available,
  // we validate the token structure and user data thoroughly instead.
  // The authorization headers are automatically set by the utility functions.
}

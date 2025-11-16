import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_authentication_token_expiration_information(
  connection: api.IConnection,
) {
  // Step 1: Perform moderator login with valid credentials
  const loginBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ILogin;

  const authorized: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginBody,
    });
  typia.assert(authorized);

  // Step 2: Extract and validate token structure
  const token: IAuthorizationToken = authorized.token;
  typia.assert(token);

  // Step 3: Verify both timestamps represent future times from login moment
  const loginTime = new Date();
  const accessTokenExpiry = new Date(token.expired_at);
  const refreshTokenExpiry = new Date(token.refreshable_until);

  TestValidator.predicate(
    "access token expiration is in the future",
    accessTokenExpiry > loginTime,
  );

  TestValidator.predicate(
    "refresh token expiration is in the future",
    refreshTokenExpiry > loginTime,
  );

  // Step 4: Verify access token has shorter expiration than refresh token
  TestValidator.predicate(
    "access token expires before refresh token",
    accessTokenExpiry < refreshTokenExpiry,
  );

  // Step 5: Verify access token typical expiration window (should be hours)
  const accessTokenExpiryHours =
    (accessTokenExpiry.getTime() - loginTime.getTime()) / (1000 * 60 * 60);
  TestValidator.predicate(
    "access token expiration is within typical hours range (1-24 hours)",
    accessTokenExpiryHours > 0 && accessTokenExpiryHours <= 24,
  );

  // Step 6: Verify refresh token typical expiration window (minimum 7 days)
  const refreshTokenExpiryDays =
    (refreshTokenExpiry.getTime() - loginTime.getTime()) /
    (1000 * 60 * 60 * 24);
  TestValidator.predicate(
    "refresh token expiration is within typical days range (minimum 7 days)",
    refreshTokenExpiryDays >= 7,
  );
}

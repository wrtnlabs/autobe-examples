import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSModerator";

export async function test_api_moderator_login_success_after_out_of_date(
  connection: api.IConnection,
) {
  // Generate realistic moderator credentials
  const email = typia.random<string & tags.Format<"email">>();

  // Generate password with required complexity: uppercase, lowercase, number, special char
  const uppercase = RandomGenerator.alphabets(1).toUpperCase();
  const lowercase = RandomGenerator.alphabets(1).toLowerCase();
  const number = RandomGenerator.alphaNumeric(1).replace(/[a-zA-Z]/g, "");
  const special = "!@#$%^&*".charAt(
    Math.floor(Math.random() * "!@#$%^&*".length),
  );
  const randomChars = RandomGenerator.alphaNumeric(6);
  const password = uppercase + lowercase + number + special + randomChars;

  const loginCredentials = {
    email,
    password,
  } satisfies ICommunityBBSModerator.ILogin;

  // First login to establish session and generate tokens
  const firstLogin: ICommunityBBSModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginCredentials,
    });
  typia.assert(firstLogin);

  // Re-login with the same credentials to verify tokens work after refresh
  // This simulates the "out of date token" scenario where previous tokens have been refreshed
  const secondLogin: ICommunityBBSModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginCredentials,
    });
  typia.assert(secondLogin);

  // Validate that the moderator's identity was successfully retained across refreshes
  TestValidator.equals(
    "moderator ID remains consistent across refreshes",
    firstLogin.id,
    secondLogin.id,
  );

  // Verify that tokens were refreshed (should be different)
  TestValidator.notEquals(
    "refreshed access token should differ from original",
    firstLogin.token.access,
    secondLogin.token.access,
  );

  TestValidator.notEquals(
    "refreshed refresh token should differ from original",
    firstLogin.token.refresh,
    secondLogin.token.refresh,
  );

  // Verify expiration timestamps are future dates using Date.parse for strict ISO format validation
  TestValidator.predicate(
    "access token should have future expiration",
    Date.parse(secondLogin.token.expired_at) > Date.now(),
  );

  TestValidator.predicate(
    "refresh token should have future refreshable until",
    Date.parse(secondLogin.token.refreshable_until) > Date.now(),
  );
}

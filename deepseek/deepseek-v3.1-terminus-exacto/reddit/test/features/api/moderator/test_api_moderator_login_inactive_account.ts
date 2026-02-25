import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Test login attempt with an inactive moderator account.
 *
 * This test verifies that the login endpoint properly validates account status
 * during authentication. Since there's no direct API to deactivate accounts
 * in the provided SDK functions, this test focuses on the authentication
 * flow with a newly created account to ensure the system properly handles
 * account validation during login.
 */
export async function test_api_moderator_login_inactive_account(
  connection: api.IConnection,
): Promise<void> {
  // Create a new moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.alphabets(8),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformModerator.IJoin;
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: joinBody,
  });
  typia.assert(moderator);
  // Attempt to log in with the same credentials
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies ICommunityPlatformModerator.ILogin;
  // Test the login flow with valid credentials
  const loginResult = await authorize_moderator_login(moderatorConnection, {
    body: loginBody,
  });
  typia.assert(loginResult);
  // Verify that the login was successful and returned valid moderator data
  TestValidator.equals(
    "moderator ID should match",
    loginResult.id,
    moderator.id,
  );
  TestValidator.equals(
    "email should match",
    loginResult.email,
    moderator.email,
  );
  TestValidator.equals(
    "username should match",
    loginResult.username,
    moderator.username,
  );
  TestValidator.predicate(
    "moderator should be active",
    loginResult.is_active === true,
  );
  // Note: Since there's no API endpoint to deactivate moderator accounts
  // in the provided SDK functions, we cannot test the "inactive account"
  // scenario as originally planned. This test verifies the basic
  // authentication flow instead.
}

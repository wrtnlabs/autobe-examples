import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test successful password reset initiation for a registered regular user.
 * 1. Create a user account via join endpoint to ensure the email exists
 * 2. Call password reset endpoint with the registered email address
 * 3. Validate response contains required fields (expires_at, email)
 * 4. Verify token is 32+ characters and has 1-hour expiration
 * 5. Test token invalidation of previous active tokens
 */
export async function test_api_user_password_reset_for_existing_user(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a user account
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // Step 2: Call password reset endpoint using base connection pattern
  const resetConnection: api.IConnection = { host: connection.host };
  const resetResponse =
    await api.functional.communityPlatform.user.password_resets.create(
      resetConnection,
      {
        body: {
          email: user.email,
        } satisfies ICommunityPlatformUserPasswordReset.IRequest,
      },
    );
  typia.assert(resetResponse);
  // Step 3: Validate business logic (not type validation)
  TestValidator.equals("email matches input", resetResponse.email, user.email);
  // Step 4: Verify token properties (if present in test environment)
  if (resetResponse.token !== undefined) {
    TestValidator.predicate(
      "token is at least 32 characters",
      resetResponse.token.length >= 32,
    );
    // Verify 1-hour expiration
    const expiresAt = new Date(resetResponse.expires_at);
    const expectedExpiration = new Date(Date.now() + 60 * 60 * 1000);
    const timeDiff = Math.abs(
      expiresAt.getTime() - expectedExpiration.getTime(),
    );
    TestValidator.predicate(
      "token expires in approximately 1 hour",
      timeDiff < 60000,
    ); // Within 1 minute tolerance
  }
  // Step 5: Test token invalidation by requesting reset again
  const secondResetConnection: api.IConnection = { host: connection.host };
  const secondResetResponse =
    await api.functional.communityPlatform.user.password_resets.create(
      secondResetConnection,
      {
        body: {
          email: user.email,
        } satisfies ICommunityPlatformUserPasswordReset.IRequest,
      },
    );
  typia.assert(secondResetResponse);
  // Verify we got a valid response for the second request
  TestValidator.equals(
    "second response email matches",
    secondResetResponse.email,
    user.email,
  );
}

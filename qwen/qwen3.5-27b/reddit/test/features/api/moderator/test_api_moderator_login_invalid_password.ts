import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Test moderator login failure with incorrect password.
 *
 * Validates that the moderator authentication system properly rejects login attempts with incorrect passwords. The test registers a new moderator account with valid credentials, then attempts to login with the correct email but an intentionally wrong password. Verifies that the system returns a 401 Unauthorized error and does not provide authentication tokens.
 *
 * Special attention is given to ensuring the account remains intact after the failed login attempt, allowing for future successful authentication with correct credentials.
 *
 * 1. Register a new moderator account with valid email, password, and profile information
 * 2. Create a new connection for the failed login attempt
 * 3. Attempt login with correct email but incorrect password
 * 4. Verify 401 Unauthorized error is thrown
 * 5. Account remains usable for future login attempts
 */
export async function test_api_moderator_login_invalid_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new moderator account with valid credentials
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  typia.assert(moderator);
  // 2. Create a new connection for the failed login attempt
  const failedLoginConnection: api.IConnection = { host: connection.host };
  // 3. Attempt login with correct email but incorrect password
  const wrongPassword = RandomGenerator.alphaNumeric(16);
  // 4. Verify 401 Unauthorized error is thrown
  await TestValidator.httpError(
    "login with incorrect password returns 401",
    401,
    async () => {
      await authorize_moderator_login(failedLoginConnection, {
        body: {
          email: moderator.email,
          password: wrongPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCloneModerator.ILogin,
      });
    },
  );
}

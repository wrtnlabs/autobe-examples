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
 * Test moderator token refresh error handling when using an invalid refresh token.
 *
 * Validates that the moderator refresh endpoint properly rejects invalid or expired refresh tokens with appropriate error response. Since we cannot wait 7 days for actual token expiration in E2E tests, we simulate the expired token scenario by using a deliberately invalid token.
 *
 * This test ensures that the authentication system maintains security by rejecting tokens that are no longer valid, whether due to expiration, invalidation, or corruption.
 *
 * 1. Register a new moderator account to obtain initial valid authentication tokens.
 * 2. Attempt to refresh authentication using an invalid refresh token (simulating expired token).
 * 3. Verify the system returns a 401 Unauthorized error as expected.
 * 4. Validate that error handling follows the expected pattern for unauthorized access.
 */
export async function test_api_moderator_refresh_with_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new moderator account to obtain initial valid tokens
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  typia.assert(authorized);
  // 2. Attempt to refresh using an invalid refresh token (simulating expired token)
  // In a real scenario, this would be an actual expired token after 7 days
  // For E2E testing, we use an invalid token to test the same error handling path
  const invalidRefreshToken = "invalid_expired_refresh_token_for_testing";
  // 3. Verify the system returns 401 Unauthorized error
  await TestValidator.httpError(
    "refresh with invalid token returns 401",
    401,
    async () => {
      const refreshConnection: api.IConnection = { host: connection.host };
      await authorize_moderator_refresh(refreshConnection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies IRedditCloneModerator.IRefresh,
      });
    },
  );
}

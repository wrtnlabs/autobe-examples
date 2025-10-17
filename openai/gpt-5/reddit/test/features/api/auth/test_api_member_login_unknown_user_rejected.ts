import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";

/**
 * Validate that login attempts with unknown principals are rejected.
 *
 * Business context:
 *
 * - The member login endpoint authenticates existing accounts by either email or
 *   username plus password.
 * - When the principal does not exist, backend must reject the authentication
 *   request.
 *
 * What this test verifies:
 *
 * 1. Without creating any account, try logging in with a random email → expect
 *    failure.
 * 2. Try logging in with a random username → expect failure.
 * 3. Ensure only valid DTO shapes are used (no type-error testing), and avoid any
 *    direct header/token manipulation (SDK manages headers).
 */
export async function test_api_member_login_unknown_user_rejected(
  connection: api.IConnection,
) {
  // Use a clean unauthenticated connection as per the allowed pattern.
  const unauth: api.IConnection = { ...connection, headers: {} };

  // Attempt with a non-existent email
  const unknownEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password1: string = RandomGenerator.alphaNumeric(16);

  await TestValidator.error(
    "login fails for unknown email account",
    async () => {
      await api.functional.auth.memberUser.login(unauth, {
        body: {
          email: unknownEmail,
          password: password1,
        } satisfies ICommunityPlatformMemberUser.ILogin,
      });
    },
  );

  // Attempt with a non-existent username
  const unknownUsername: string = `user_${RandomGenerator.alphaNumeric(18)}`;
  const password2: string = RandomGenerator.alphaNumeric(16);

  await TestValidator.error(
    "login fails for unknown username account",
    async () => {
      await api.functional.auth.memberUser.login(unauth, {
        body: {
          username: unknownUsername,
          password: password2,
        } satisfies ICommunityPlatformMemberUser.ILogin,
      });
    },
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityModeratorJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorJoin";
import type { ICommunityPlatformCommunityModeratorLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorLogin";

/**
 * Verify community moderator login rejects wrong credentials and does not
 * establish an authorized session.
 *
 * Business flow:
 *
 * 1. Register a new community moderator user via join with valid identifiers.
 * 2. Attempt login with the correct email but an incorrect password → expect an
 *    error.
 * 3. Attempt login with a non-existent email (valid format) → expect an error.
 *
 * Notes:
 *
 * - Error validations are done with TestValidator.error without asserting status
 *   codes or payloads.
 * - For unauthenticated login attempts, create a fresh connection with empty
 *   headers and never touch them afterward.
 */
export async function test_api_community_moderator_login_wrong_password(
  connection: api.IConnection,
) {
  // 1) Register a known user (successful join)
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const username: string = RandomGenerator.alphabets(8); // matches ^[A-Za-z0-9_]{3,20}$
  const strongPassword: string = "Passw0rd1"; // 8+ chars, contains letters and digits

  const joinBody = {
    email,
    username,
    password: strongPassword,
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
    // optional marketing flags omitted intentionally
  } satisfies ICommunityPlatformCommunityModeratorJoin.ICreate;

  const joined: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // Prepare a clean, unauthenticated connection for login attempts
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2) Wrong password with existing email
  const wrongPassword: string = "WrongPass1"; // valid length, intentionally incorrect
  await TestValidator.error(
    "login with correct email but wrong password must fail",
    async () => {
      await api.functional.auth.communityModerator.login(unauthConn, {
        body: {
          email,
          password: wrongPassword,
        } satisfies ICommunityPlatformCommunityModeratorLogin.IRequest,
      });
    },
  );

  // 3) Non-existent email (valid email format) also fails (non-enumerability)
  const unknownEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  await TestValidator.error(
    "login with non-existent email must fail without leakage",
    async () => {
      await api.functional.auth.communityModerator.login(unauthConn, {
        body: {
          email: unknownEmail,
          password: wrongPassword,
        } satisfies ICommunityPlatformCommunityModeratorLogin.IRequest,
      });
    },
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityModeratorPassword } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorPassword";

/**
 * Deny unauthenticated password changes for community moderators.
 *
 * This test verifies that the protected self-scope endpoint PUT /my/password
 * rejects requests made without authentication. It constructs a valid password
 * change payload but sends it through an unauthenticated connection, expecting
 * the backend to deny the operation. No specific HTTP status code is asserted;
 * only the occurrence of an error is required.
 *
 * Steps:
 *
 * 1. Create an unauthenticated connection by cloning the given connection with
 *    empty headers.
 * 2. Build a valid ICommunityPlatformCommunityModeratorPassword.IUpdate payload.
 * 3. Call the API with the unauthenticated connection and expect an error.
 * 4. If connection.simulate is true, the SDK simulator does not enforce auth; in
 *    that case, call the API and only assert the response type for stability.
 */
export async function test_api_community_moderator_password_change_unauthenticated(
  connection: api.IConnection,
) {
  // 1) Create an unauthenticated connection (do not manipulate headers afterward)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2) Build a valid password change payload
  const payload = {
    current_password: RandomGenerator.alphaNumeric(12),
    new_password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformCommunityModeratorPassword.IUpdate;

  // 3) In real mode, unauthenticated requests must error. In simulate mode, the
  // SDK returns random success without auth checks; assert type for stability.
  if (connection.simulate === true) {
    const output: ICommunityPlatformCommunityModerator.ISecurity =
      await api.functional.my.password.updatePassword(unauthConn, {
        body: payload,
      });
    typia.assert(output);
    return;
  }

  await TestValidator.error(
    "unauthenticated moderator cannot change own password",
    async () => {
      await api.functional.my.password.updatePassword(unauthConn, {
        body: payload,
      });
    },
  );
}

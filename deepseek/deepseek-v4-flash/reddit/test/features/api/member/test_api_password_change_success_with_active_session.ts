import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that an authenticated member can successfully change their password
 * and their session remains active.
 *
 * Registers a new member with known credentials, changes the password, and
 * validates that the authenticated session token remains valid after the
 * password change. Also verifies that the new password is effective by
 * using it as the current password in a subsequent change call.
 *
 * 1. Register a new member with a known password.
 * 2. Change the password to a new one using the authenticated session.
 * 3. Verify the session remains active by attempting another authenticated
 *    API call with the same token — expects a business logic error (400)
 *    rather than an authentication error.
 * 4. Verify the new password is effective by using it as the current password
 *    in a subsequent password change.
 */
export async function test_api_password_change_success_with_active_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member with a known password
  const oldPassword = RandomGenerator.alphaNumeric(16);
  const newPassword = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: { password: oldPassword },
  });
  typia.assert(authorized);
  // 2. Change password - should succeed with void response
  await api.functional.communityPlatform.member.password.change(
    memberConnection,
    {
      body: {
        currentPassword: oldPassword,
        newPassword: newPassword,
      } satisfies ICommunityPlatformMember.IChangePassword,
    },
  );
  // 3. Verify session remains active after password change
  // The same connection (with original token) still works for authenticated
  // requests. Calling with wrong current password should get 400 (business
  // validation error), not 401 (authentication error), proving the session
  // is still valid.
  await TestValidator.httpError(
    "wrong current password should be rejected with 400",
    400,
    async () => {
      await api.functional.communityPlatform.member.password.change(
        memberConnection,
        {
          body: {
            currentPassword: "incorrect_password_xyz",
            newPassword: RandomGenerator.alphaNumeric(16),
          } satisfies ICommunityPlatformMember.IChangePassword,
        },
      );
    },
  );
  // 4. Verify new password is effective by using it as the current password
  // in another password change. If this succeeds, the new password has been
  // properly set and is now the active password.
  await api.functional.communityPlatform.member.password.change(
    memberConnection,
    {
      body: {
        currentPassword: newPassword,
        newPassword: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformMember.IChangePassword,
    },
  );
}

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
 * Test that the password change endpoint rejects insufficient new passwords while keeping the session active.
 *
 * Validates the security requirements enforcement of the password change operation. Registers a member with a known password, then attempts to change it using an insufficient (too short) new password — expects the request to be rejected. Then attempts the same flow with a valid new password to confirm the session remains active between attempts.
 *
 * 1. Register a new member account with a known strong password via `authorize_member_join`.
 * 2. Attempt password change with an insufficient new password (`"abc"`) — expects rejection due to unmet security requirements.
 * 3. Attempt password change with a valid new password — expects success, confirming the previous rejection did not invalidate the session.
 */
export async function test_api_password_change_with_insufficient_new_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member with a known password
  const password = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: { password },
  });
  typia.assert(authorized);
  // 2. Attempt password change with an insufficient new password
  //    Expect rejection due to failing security requirements
  await TestValidator.error(
    "password change rejected for insufficient new password",
    async () => {
      await api.functional.communityPlatform.member.password.change(
        memberConnection,
        {
          body: {
            currentPassword: password,
            newPassword: "abc",
          } satisfies ICommunityPlatformMember.IChangePassword,
        },
      );
    },
  );
  // 3. Attempt password change with a valid new password
  //    This should succeed, confirming the session is still active
  const newPassword = RandomGenerator.alphaNumeric(16);
  await api.functional.communityPlatform.member.password.change(
    memberConnection,
    {
      body: {
        currentPassword: password,
        newPassword,
      } satisfies ICommunityPlatformMember.IChangePassword,
    },
  );
}

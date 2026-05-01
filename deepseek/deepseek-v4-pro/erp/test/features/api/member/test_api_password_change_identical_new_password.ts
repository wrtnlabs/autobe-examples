import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that password change is rejected when the new password is identical to the current password.
 *
 * Validates that the password change endpoint enforces a meaningful update by rejecting requests where currentPassword and newPassword are the same value. This ensures users cannot perform no-op password changes.
 *
 * 1. A new member joins the platform with a known password.
 * 2. The member attempts to change their password, supplying the same value for both currentPassword and newPassword.
 * 3. The server responds with an error indicating the new password must differ from the current password.
 */
export async function test_api_password_change_identical_new_password(
  connection: api.IConnection,
) {
  // 1. Join as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const member = await authorize_member_join(memberConnection, {
    body: {
      password,
    },
  });
  typia.assert(member);
  // 2. Attempt to change password with identical new password
  await TestValidator.error("identical new password rejection", async () => {
    await api.functional.erpHrm.member.passwords.change(memberConnection, {
      body: {
        currentPassword: password,
        newPassword: password,
      } satisfies IErpHrmMember.IChangePassword,
    });
  });
}

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
 * Verify that an authenticated member can successfully change their password.
 *
 * Validates the complete password change flow: registering a new member account with known credentials via the join utility, then changing the password using the correct current password for authentication and providing a new, different password that meets strength requirements. The endpoint verifies the current password against the stored hash and replaces it with the new one on success.
 *
 * The member's profile, role assignments, and organization memberships are unaffected by a password change, and the current session is preserved without requiring re-authentication. The password change takes effect immediately for all subsequent authentication attempts.
 *
 * 1. Register a new member via the join utility with a known email and password.
 * 2. Call the password change endpoint with the correct current password and a new, different password.
 * 3. Confirm the operation succeeds by returning void (2xx with no response body).
 */
export async function test_api_password_change_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member with known credentials
  const email = typia.random<string & tags.Format<"email">>();
  const currentPassword = typia.random<string & tags.Format<"password">>();
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email,
      password: currentPassword,
    },
  });
  typia.assert(member);
  // 2. Change password with a new, different password
  const newPassword = typia.random<string & tags.Format<"password">>();
  await api.functional.erpHrm.member.passwords.change(memberConnection, {
    body: {
      currentPassword,
      newPassword,
    } satisfies IErpHrmMember.IChangePassword,
  });
}

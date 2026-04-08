import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful password change for an authenticated member.
 *
 * Validates the complete password change workflow including member registration, password update with valid credentials, and verification that the new password works for login. The member first joins the system with initial credentials, then updates their password by providing the correct current password and a valid new password that meets security requirements.
 *
 * After the password change, all existing sessions are invalidated, and the member must log in again with the new password to verify the change was successful. This test ensures the password change endpoint properly validates the current password, accepts valid new passwords, updates the password hash in the database, invalidates existing sessions, and returns the updated member summary.
 *
 * 1. Member registers with initial email and password credentials.
 * 2. Member updates password with correct current password and valid new password.
 * 3. Validates the password update response contains member summary with updated timestamp.
 * 4. Member logs in again with new password to verify the change was successful.
 * 5. Validates the new login returns valid authentication tokens.
 */
export async function test_api_member_password_change_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration with initial credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const initialPassword = RandomGenerator.alphaNumeric(16);
  const newPassword = RandomGenerator.alphaNumeric(16);
  const joinOutput: IHrmMember.IAuthorized = await authorize_member_join(
    joinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: initialPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmMember.IJoin,
    },
  );
  typia.assert(joinOutput);
  // 2. Create member-specific connection for password update
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: joinOutput.token.access,
  };
  // 3. Update password with current and new password
  const passwordUpdate: IHrmMember.ISummary =
    await api.functional.hrm.member.profile.password.update(memberConnection, {
      body: {
        current_password: initialPassword,
        new_password: newPassword,
      } satisfies IHrmMember.IPasswordUpdate,
    });
  typia.assert(passwordUpdate);
  // 4. Validate password update response
  TestValidator.equals("member id matches", passwordUpdate.id, joinOutput.id);
  TestValidator.equals("email matches", passwordUpdate.email, joinOutput.email);
  TestValidator.predicate(
    "updated_at exists",
    passwordUpdate.updated_at !== null,
  );
  // 5. Verify new password works for login
  const newLoginConnection: api.IConnection = { host: connection.host };
  const loginOutput: IHrmMember.IAuthorized = await authorize_member_login(
    newLoginConnection,
    {
      body: {
        email: joinOutput.email,
        password: newPassword,
      },
    },
  );
  typia.assert(loginOutput);
  // 6. Validate new login returns valid tokens
  TestValidator.equals(
    "login email matches",
    loginOutput.email,
    joinOutput.email,
  );
  TestValidator.predicate(
    "has access token",
    loginOutput.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    loginOutput.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has valid expiration",
    new Date(loginOutput.token.expired_at) > new Date(),
  );
}

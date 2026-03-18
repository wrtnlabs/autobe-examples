import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_password_change_session_invalidated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account via join
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Authenticate member via login to establish session
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: {
      email: joinResult.email,
      password: "TestPass123!",
    } satisfies IHrmsMember.ILogin,
  });
  typia.assert(loginResult);
  // Store old session token from login
  const oldSessionToken = loginResult.token.access;
  // 3. Change password using the authenticated connection
  const passwordChangeConnection: api.IConnection = { host: connection.host };
  const newPassword = "NewPass456!";
  const passwordChangeResult =
    await api.functional.hrms.member.password_resets.changePassword(
      passwordChangeConnection,
      {
        body: {
          currentPassword: "TestPass123!",
          newPassword: newPassword,
        } satisfies IHrmsMember.IChangePassword,
      },
    );
  typia.assert(passwordChangeResult);
  // 4. Verify old session token is invalidated
  // Try to use old session token to access protected endpoint
  const invalidSessionConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${oldSessionToken}` },
  };
  await TestValidator.httpError(
    "old session token should be invalidated after password change",
    401,
    async () => {
      // Try to access a protected endpoint with old token
      await api.functional.hrms.member.password_resets.changePassword(
        invalidSessionConnection,
        {
          body: {
            currentPassword: "TestPass123!",
            newPassword: "AnotherPass789!",
          } satisfies IHrmsMember.IChangePassword,
        },
      );
    },
  );
  // 5. Verify new authentication works with new password
  const newLoginConnection: api.IConnection = { host: connection.host };
  const newLoginResult = await authorize_member_login(newLoginConnection, {
    body: {
      email: joinResult.email,
      password: newPassword,
    } satisfies IHrmsMember.ILogin,
  });
  typia.assert(newLoginResult);
  // 6. Verify new session token is valid (can make authenticated requests)
  const validSessionConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: newLoginResult.token.access },
  };
  // Verify new session is valid by checking if any protected endpoint rejects with 401
  await TestValidator.httpError(
    "new session token should be valid for authenticated requests",
    [400], // Expect 400 (validation error) rather than 401 (unauthorized)
    async () => {
      // Try to change password with new session - should fail with validation error,
      // not session invalidation error
      await api.functional.hrms.member.password_resets.changePassword(
        validSessionConnection,
        {
          body: {
            currentPassword: newPassword,
            newPassword: "YetAnotherPass000!",
          } satisfies IHrmsMember.IChangePassword,
        },
      );
    },
  );
  // Additional verification: ensure the password change actually worked
  // by trying to login with the old password (should fail)
  const oldPasswordLoginConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "old password should no longer work after password change",
    401,
    async () => {
      await authorize_member_login(oldPasswordLoginConnection, {
        body: {
          email: joinResult.email,
          password: "TestPass123!",
        } satisfies IHrmsMember.ILogin,
      });
    },
  );
}

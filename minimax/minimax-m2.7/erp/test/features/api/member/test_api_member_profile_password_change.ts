import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_password_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: `test_${Date.now()}@example.com`,
      password: "OriginalPass123",
      display_name: "Test Member",
    },
  });
  typia.assert(authorized);
  const originalEmail = authorized.email;
  const newPassword = "NewPass456";
  // 2. Test successful password change
  const updatedMember = await api.functional.erpHrm.member.profile.update(
    memberConnection,
    {
      body: {
        password: newPassword,
      } satisfies IErpHrmMember.IUpdate,
    },
  );
  typia.assert(updatedMember);
  // 3. Verify password_hash is NOT in the response
  TestValidator.equals(
    "password_hash should not be in response",
    (updatedMember as any).password_hash,
    undefined,
  );
  // 4. Test password validation - too short (less than 8 characters)
  await TestValidator.error(
    "should reject password shorter than 8 characters",
    async () => {
      await api.functional.erpHrm.member.profile.update(memberConnection, {
        body: {
          password: "Short1",
        } satisfies IErpHrmMember.IUpdate,
      });
    },
  );
  // 5. Test password validation - missing number
  await TestValidator.error(
    "should reject password without number",
    async () => {
      await api.functional.erpHrm.member.profile.update(memberConnection, {
        body: {
          password: "NoNumberHere",
        } satisfies IErpHrmMember.IUpdate,
      });
    },
  );
  // 6. Test password validation - missing letter
  await TestValidator.error(
    "should reject password without letter",
    async () => {
      await api.functional.erpHrm.member.profile.update(memberConnection, {
        body: {
          password: "12345678",
        } satisfies IErpHrmMember.IUpdate,
      });
    },
  );
  // 7. Verify new password works - create new connection with new password
  const loginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(loginConnection, {
    body: {
      email: originalEmail,
      password: newPassword,
      href: "/login",
      referrer: "/profile",
    },
  });
  // 8. Verify login was successful by making an authenticated API call
  const verificationMember = await api.functional.erpHrm.member.profile.update(
    loginConnection,
    {
      body: {},
    },
  );
  typia.assert(verificationMember);
  TestValidator.equals(
    "member ID should match after login with new password",
    verificationMember.id,
    authorized.id,
  );
}
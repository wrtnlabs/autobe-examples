import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_change_password_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account with valid strong password
  const originalPassword = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const registeredMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: originalPassword,
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(registeredMember);
  // Step 2: Change password to a new secure password
  const newPassword = RandomGenerator.alphaNumeric(16);
  await api.functional.redditClone.member.users.me.change_password.updatePassword(
    memberConnection,
    {
      body: {
        currentPassword: originalPassword,
        newPassword: newPassword,
      } satisfies IRedditCloneMember.IChangePassword,
    },
  );
  // Step 3: Verify old password is invalidated
  const oldPasswordConnection: api.IConnection = {
    host: connection.host,
  };
  await TestValidator.error(
    "old password should be rejected after change",
    async () => {
      await api.functional.redditClone.auth.member.login(
        oldPasswordConnection,
        {
          body: {
            email: registeredMember.email,
            password: originalPassword,
          },
        },
      );
    },
  );
  // Step 4: Verify new password works by logging in
  const newPasswordConnection: api.IConnection = {
    host: connection.host,
  };
  const loggedinMember = await authorize_member_login(newPasswordConnection, {
    body: {
      email: registeredMember.email,
      password: newPassword,
    },
  });
  typia.assert(loggedinMember);
  // Step 5: Verify user identity matches
  TestValidator.equals(
    "user identity should match after password change",
    loggedinMember.id,
    registeredMember.id,
  );
  TestValidator.equals(
    "email should match after password change",
    loggedinMember.email,
    registeredMember.email,
  );
}

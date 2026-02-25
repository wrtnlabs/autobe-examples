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
  // 1. Create member account with valid strong password
  const registerConnection: api.IConnection = { host: connection.host };
  const generatedPassword = RandomGenerator.alphaNumeric(16);
  const member = await authorize_member_join(registerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: generatedPassword,
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member);
  // 2. Change password with current valid password and new password
  const newPassword = RandomGenerator.alphaNumeric(16);
  const changePasswordConnection: api.IConnection = {
    host: connection.host,
    headers: registerConnection.headers,
  };
  await api.functional.redditClone.member.users.me.change_password.updatePassword(
    changePasswordConnection,
    {
      body: {
        currentPassword: generatedPassword,
        newPassword: newPassword,
      } satisfies IRedditCloneMember.IChangePassword,
    },
  );
}

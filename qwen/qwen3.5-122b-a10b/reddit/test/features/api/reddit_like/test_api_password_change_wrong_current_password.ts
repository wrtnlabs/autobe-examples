import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_password_change_wrong_current_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const originalPassword = RandomGenerator.alphaNumeric(16);
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: originalPassword,
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Attempt to change password with wrong current password
  const wrongPassword = RandomGenerator.alphaNumeric(16);
  const newPassword = RandomGenerator.alphaNumeric(16);
  await TestValidator.httpError(
    "wrong current password should reject password change with 401 Unauthorized",
    401,
    async () => {
      await api.functional.redditLike.member.password.update(memberConnection, {
        body: {
          currentPassword: wrongPassword,
          newPassword: newPassword,
        } satisfies IRedditLikeMember.IPasswordChange,
      });
    },
  );
  // 3. Verify member can still login with original password
  const loginConnection: api.IConnection = { host: connection.host };
  const reauthorized = await api.functional.redditLike.auth.member.login(
    loginConnection,
    {
      body: {
        email: authorized.email,
        password: originalPassword,
      },
    },
  );
  typia.assert(reauthorized);
  TestValidator.equals(
    "member still accessible after failed password change",
    reauthorized.id,
    authorized.id,
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member login failure with invalid credentials.
 *
 * 1. Create a member account via authorize_member_join
 * 2. Attempt login with the correct email but wrong password
 * 3. Verify that the system returns 401 Unauthorized rejection
 */
export async function test_api_member_login_invalid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Attempt login with incorrect password
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "should return 401 for invalid credentials",
    401,
    async () => {
      await authorize_member_login(loginConnection, {
        body: {
          email: member.email,
          password: "wrong_password_12345",
        } satisfies IMultiUserTodoMember.ILogin,
      });
    },
  );
}

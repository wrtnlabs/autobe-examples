import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that login with an incorrect password returns 401 Unauthorized.
 *
 * Validates the security behavior of the member login endpoint by verifying that an incorrect password is rejected with a generic 401 Unauthorized response. The server must not reveal whether the email exists, preventing user enumeration attacks.
 *
 * 1. Register a new member account via authorize_member_join with randomized credentials so the email is known to exist.
 * 2. Attempt to log in with the correct email but a deliberately wrong password using the SDK directly.
 * 3. Verify the server returns a 401 Unauthorized error via TestValidator.httpError.
 */
export async function test_api_member_login_incorrect_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member account so the email exists in the system
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Attempt login with correct email but wrong password
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "incorrect password returns 401",
    401,
    async () => {
      await api.functional.todoApp.auth.member.login(loginConnection, {
        body: {
          email: member.email,
          password: "wrong-password",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies ITodoAppMember.ILogin,
      });
    },
  );
}

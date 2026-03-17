import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test login failure when member provides correct email but incorrect password.
 * Validates that the system returns 401 Unauthorized and doesn't leak whether
 * email exists or password is wrong (security best practice).
 */
export async function test_api_member_login_invalid_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register a new member account
  const joinConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const correctPassword = RandomGenerator.alphaNumeric(16);
  const member = await authorize_member_join(joinConnection, {
    body: {
      email: memberEmail,
      password: correctPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 2. Attempt login with correct email but wrong password
  const loginConnection: api.IConnection = { host: connection.host };
  const wrongPassword = RandomGenerator.alphaNumeric(16);
  // Expected to fail with 401 Unauthorized
  await TestValidator.httpError(
    "should return 401 for invalid password",
    [401],
    async () => {
      await authorize_member_login(loginConnection, {
        body: {
          email: memberEmail,
          password: wrongPassword,
        } satisfies IMultiUserTodoAppMember.ILogin,
      });
    },
  );
  // 3. Verify no successful authorization occurred
  TestValidator.predicate(
    "should not have valid token after failed login",
    () => !loginConnection.headers?.authorization,
  );
}

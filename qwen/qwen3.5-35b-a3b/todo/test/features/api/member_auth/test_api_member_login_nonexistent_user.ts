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

export async function test_api_member_login_nonexistent_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a valid registered user account
  const joinConnection: api.IConnection = { host: connection.host };
  const existingEmail = typia.random<string & tags.Format<"email">>();
  const existingPassword = RandomGenerator.alphaNumeric(16);
  const existingUser = await authorize_member_join(joinConnection, {
    body: {
      email: existingEmail,
      password: existingPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoAppMember.IJoin,
  });
  typia.assert(existingUser);
  // 2. Attempt login with a DIFFERENT non-existent email
  const fakeEmail = typia.random<string & tags.Format<"email">>();
  TestValidator.notEquals(
    "fake email must differ from existing user email",
    fakeEmail,
    existingEmail,
  );
  const loginConnection: api.IConnection = { host: connection.host };
  const fakePassword = RandomGenerator.alphaNumeric(16);
  // 3. Verify login fails with 401 Unauthorized for non-existent user
  // This prevents email enumeration attacks by not revealing if email exists
  await TestValidator.error(
    "non-existent user login returns 401 Unauthorized",
    async () => {
      await authorize_member_login(loginConnection, {
        body: {
          email: fakeEmail,
          password: fakePassword,
        } satisfies IMultiUserTodoAppMember.ILogin,
      });
    },
  );
}

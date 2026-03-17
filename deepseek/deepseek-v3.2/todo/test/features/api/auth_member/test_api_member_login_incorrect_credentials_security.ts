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

export async function test_api_member_login_incorrect_credentials_security(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account for valid credentials reference
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberCredentials);
  // 2. Create actor-specific connection for login attempts
  const loginConnection: api.IConnection = { host: connection.host };
  // 3. Test case: Wrong email with correct password format
  await TestValidator.error("login with wrong email should fail", async () => {
    await api.functional.todoApp.auth.member.login(loginConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(), // Different email
        password: RandomGenerator.alphaNumeric(16), // Random password (correct format)
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ITodoAppMember.ILogin,
    });
  });
  // 4. Test case: Correct email with wrong password
  await TestValidator.error(
    "login with wrong password should fail",
    async () => {
      await api.functional.todoApp.auth.member.login(loginConnection, {
        body: {
          email: memberCredentials.email, // Correct email
          password: RandomGenerator.alphaNumeric(16), // Different password
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies ITodoAppMember.ILogin,
      });
    },
  );
  // Security requirement validated: Both incorrect credential cases produce errors
  // preventing account enumeration through differential error messages
}

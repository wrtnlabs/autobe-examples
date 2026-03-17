import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member login failure when password is incorrect.
 *
 * This test verifies that:
 * 1. A member account can be created with valid credentials
 * 2. Login with incorrect password throws an error
 * 3. The system properly rejects invalid authentication attempts
 */
export async function test_api_member_login_password_incorrect(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account with known credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const joinConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(joinConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Attempt login with incorrect password
  const incorrectPassword = RandomGenerator.alphaNumeric(16) + "_wrong";
  // Create a fresh connection for login attempt
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "should throw error for incorrect password",
    async () => {
      await api.functional.privateTodoApp.auth.member.login(loginConnection, {
        body: {
          email,
          password: incorrectPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IPrivateTodoAppMember.ILogin,
      });
    },
  );
}

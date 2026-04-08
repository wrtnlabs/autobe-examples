import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_wrong_password_rejected(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify that member login fails when the password is incorrect.
   *
   * This scenario ensures the private todo app rejects credential mismatches
   * without exposing sensitive account details or mutating the stored member
   * record. It also confirms the original account remains valid by performing
   * a successful login with the correct password after the failed attempt.
   *
   * 1. Register a new member account with unique credentials.
   * 2. Attempt login with the same email but an incorrect password.
   * 3. Confirm the authentication attempt is rejected with an error.
   * 4. Log in again using the correct password to prove the account is unchanged.
   */
  const memberConnection: api.IConnection = { host: connection.host };
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string & tags.Format<"password"> =
    `P@ssw0rd-${RandomGenerator.alphaNumeric(10)}`;
  const wrongPassword: string & tags.Format<"password"> =
    `WrongP@ss-${RandomGenerator.alphaNumeric(12)}`;
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(joined);
  const failedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "member login should reject wrong password",
    async () => {
      await authorize_member_login(failedConnection, {
        body: {
          email,
          password: wrongPassword,
        } satisfies ITodoAppMember.ILogin,
      });
    },
  );
  const reloginConnection: api.IConnection = { host: connection.host };
  const relogin = await authorize_member_login(reloginConnection, {
    body: {
      email,
      password,
    } satisfies ITodoAppMember.ILogin,
  });
  typia.assert(relogin);
  TestValidator.equals(
    "relogin email should match account email",
    relogin.email,
    email,
  );
  TestValidator.equals(
    "stored account id should remain stable",
    relogin.id,
    joined.id,
  );
  TestValidator.equals(
    "account should remain active",
    relogin.deleted_at,
    joined.deleted_at,
  );
}

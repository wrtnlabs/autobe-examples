import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_login(
  connection: api.IConnection,
): Promise<void> {
  // Generate test credentials
  const testEmail = `${RandomGenerator.name()}@example.com`;
  const testPassword = RandomGenerator.alphaNumeric(12);
  // Create a user account
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_member_join(userConnection, {
    body: {
      email: testEmail,
      password: testPassword,
      name: RandomGenerator.name(),
    },
  });
  // Verify user was created
  typia.assert(user);
  // Log in with the credentials we created
  const loginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(loginConnection, {
    body: {
      email: testEmail,
      password: testPassword,
    } satisfies ITodoUser.ILogin,
  });
  // Verify login response
  typia.assert(user);
  TestValidator.equals("user email matches", user.email, testEmail);
  TestValidator.equals("user name matches", user.name, user.name);
}

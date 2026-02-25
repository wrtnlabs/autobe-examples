import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_login_non_existent_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a legitimate user to create a valid user in the system
  const userConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    displayName: RandomGenerator.name(),
    href: "https://test.com/join",
    referrer: "https://test.com/referrer",
    ip: null,
  } satisfies IMultiUserTodoUser.IJoin;
  const authorizedUser = await authorize_user_join(userConnection, {
    body: joinBody,
  });
  typia.assert(authorizedUser);
  // 2. Attempt to login with a non-existent email
  // Construct a random email that is highly unlikely to exist
  const nonExistentEmail = `${RandomGenerator.alphabets(10)}@nonexistent.test`;
  const loginBody = {
    email: nonExistentEmail,
    password: RandomGenerator.alphabets(12), // random password
  } satisfies IMultiUserTodoUser.ILogin;
  // 3. Expect login to throw HttpError with 401 status
  await TestValidator.httpError(
    "login attempts with non-existent email",
    401,
    async () => {
      // Use the userConnection but do NOT authorize with any token for this login
      // This call must be done without setting Authorization header so we use fresh connection
      const freshConnection: api.IConnection = { host: connection.host };
      await authorize_user_login(freshConnection, { body: loginBody });
    },
  );
}

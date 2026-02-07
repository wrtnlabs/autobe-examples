import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration setup
  const registrationConnection: api.IConnection = { host: connection.host };
  const registrationEmail =
    RandomGenerator.name().toLowerCase() + "@example.com";
  const registrationPassword = "TestPass!123";
  await authorize_user_join(registrationConnection, {
    body: {
      email: registrationEmail,
      password: registrationPassword,
    },
  });
  // 2. Generate valid test credentials
  const email = registrationEmail;
  const password = registrationPassword;
  // 3. User login authentication
  const loginConnection: api.IConnection = { host: connection.host };
  const output = await authorize_user_login(loginConnection, {
    body: {
      email,
      password,
    },
  });
  typia.assert(output);
}

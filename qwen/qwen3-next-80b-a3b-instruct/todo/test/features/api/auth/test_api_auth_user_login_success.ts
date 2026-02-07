import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_auth_user_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new user account first
  const joinConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(joinConnection, {
    body: {},
  } satisfies ITodoAppUser.IJoin);
  // 2. Use the created account credentials to login
  const loginConnection: api.IConnection = { host: connection.host };
  const authResponse: ITodoAppUser.IAuthorized = await authorize_user_login(
    loginConnection,
    {
      body: {} satisfies ITodoAppUser.ILogin,
    },
  );
  typia.assert(authResponse);
}

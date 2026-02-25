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

export async function test_api_user_profile_retrieval_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Prepare a new connection without any authorization headers
  const anonConnection: api.IConnection = { host: connection.host };
  // Attempt to call the protected profile endpoint without token
  await TestValidator.httpError(
    "access user profile without authentication should be rejected with 401",
    401,
    async () => {
      await api.functional.multiUserTodo.user.users.at(anonConnection);
    },
  );
}

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

export async function test_api_user_account_deletion_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // This test validates that unauthenticated users cannot delete accounts.
  // We attempt to call the erase API without setting Authorization headers.
  // 1. Create a separate connection with no authentication headers
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // 2. Attempt deletion and expect an HTTP error 401 Unauthorized
  await TestValidator.httpError(
    "unauthorized user account deletion should fail with 401",
    401,
    async () => {
      await api.functional.multiUserTodo.user.users.erase(
        unauthorizedConnection,
      );
    },
  );
}

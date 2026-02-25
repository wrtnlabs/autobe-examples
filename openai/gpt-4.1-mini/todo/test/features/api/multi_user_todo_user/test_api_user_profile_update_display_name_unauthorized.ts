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

export async function test_api_user_profile_update_display_name_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Create a user by joining to have a valid user in the system
  const joinConnection: api.IConnection = { host: connection.host };
  const joinBody: IMultiUserTodoUser.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    displayName: RandomGenerator.name(),
    href: "https://example.com/register",
    referrer: "https://example.com/referrer",
    ip: null,
  };
  const authorizedUser = await authorize_user_join(joinConnection, {
    body: joinBody,
  });
  // Attempt to update profile without authentication (base connection, no token)
  const updateBody: IMultiUserTodoUser.IUpdate = {
    displayName: RandomGenerator.name(),
  };
  await TestValidator.httpError(
    "update profile without auth should fail with 401",
    401,
    async () => {
      await api.functional.multiUserTodo.user.profile.updateProfile(
        connection,
        {
          body: updateBody,
        },
      );
    },
  );
}

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

export async function test_api_user_profile_update_display_name_special_characters(
  connection: api.IConnection,
): Promise<void> {
  // 1. User joins (empty body due to DTO empty schema)
  const userConnection: api.IConnection = { host: connection.host };
  const joinBody: IMultiUserTodoUser.IJoin = {};
  const authorized = await authorize_user_join(userConnection, {
    body: joinBody,
  });
  userConnection.headers ??= {};
  userConnection.headers.Authorization = authorized.token.access;
  // 2. Update display name with empty body (due to DTO empty schema)
  const updateBody: IMultiUserTodoUser.IUpdate = {};
  const updatedUser =
    await api.functional.multiUserTodo.user.profile.updateProfile(
      userConnection,
      { body: updateBody },
    );
  typia.assert(updatedUser);
}

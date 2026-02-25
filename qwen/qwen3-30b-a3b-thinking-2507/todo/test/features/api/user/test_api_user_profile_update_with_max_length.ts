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

export async function test_api_user_profile_update_with_max_length(
  connection: api.IConnection,
) {
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  const displayName = RandomGenerator.alphabets(30);
  const response = await api.functional.todoApp.user.profile.update(
    userConnection,
    {
      body: { display_name: displayName } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(response);
  TestValidator.equals(
    "display name matches",
    response.display_name,
    displayName,
  );
}

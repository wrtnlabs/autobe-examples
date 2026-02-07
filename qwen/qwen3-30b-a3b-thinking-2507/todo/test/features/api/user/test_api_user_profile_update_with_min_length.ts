import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoProfile";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_profile_update_with_min_length(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration via /auth/user/join
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {} satisfies ITodoUser.IJoin,
  });
  // 2. Update user profile with 1-character display name
  const display_name = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<20>
  >();
  const profile = await api.functional.todo.user.profile.update(
    userConnection,
    {
      body: {
        display_name: display_name satisfies string &
          tags.MinLength<1> &
          tags.MaxLength<20>,
      } satisfies ITodoProfile.IUpdate,
    },
  );
  typia.assert(profile);
  // 3. Validate profile update
  TestValidator.equals("display name length", profile.display_name.length, 1);
}

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

export async function test_api_user_profile_updated_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user account
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ITodoAppUser.IJoin,
  });
  // 2. Update display name
  const newDisplayName = RandomGenerator.name();
  const updatedUser = await api.functional.todoApp.user.profile.update(
    userConnection,
    {
      body: {
        display_name: newDisplayName,
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(updatedUser);
  // 3. Verify profile
  const profile = await api.functional.todoApp.user.profile.at(userConnection);
  typia.assert(profile);
  TestValidator.equals(
    "display_name matches",
    profile.display_name,
    newDisplayName,
  );
}

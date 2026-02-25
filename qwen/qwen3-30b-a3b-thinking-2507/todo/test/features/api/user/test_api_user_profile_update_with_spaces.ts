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

export async function test_api_user_profile_update_with_spaces(
  connection: api.IConnection,
): Promise<void> {
  // Create user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoAppUser.IJoin,
  });
  // Generate name with spaces
  const newName = RandomGenerator.name();
  // Update profile with name containing spaces
  const updatedProfile = await api.functional.todoApp.user.profile.update(
    userConnection,
    {
      body: {
        display_name: newName,
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  // Validate display name matches input
  TestValidator.equals(
    "display name matches input",
    updatedProfile.display_name,
    newName,
  );
}

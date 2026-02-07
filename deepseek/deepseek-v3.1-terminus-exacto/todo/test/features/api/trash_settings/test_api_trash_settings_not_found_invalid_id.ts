import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppTrashSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashSetting";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_trash_settings_not_found_invalid_id(
  connection: api.IConnection,
): Promise<void> {
  // Create a dedicated connection for the user
  const userConnection: api.IConnection = { host: connection.host };
  // Register and authenticate a user
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // Generate a valid UUID that does not correspond to any existing trash settings
  const nonExistentSettingId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve trash settings with the non-existent ID
  await TestValidator.error(
    "should throw error for non-existent trash settings",
    async () => {
      await api.functional.todoApp.user.trash.settings.at(userConnection, {
        settingId: nonExistentSettingId,
      });
    },
  );
}

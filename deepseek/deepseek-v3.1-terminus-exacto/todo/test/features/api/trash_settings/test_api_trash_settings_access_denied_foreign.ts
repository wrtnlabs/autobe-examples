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

/**
 * Test access denial when attempting to retrieve trash settings that belong to a different user.
 * This scenario validates the security and privacy requirements by ensuring users cannot access
 * other users' trash management settings. The test creates two separate user accounts and
 * attempts to access one user's trash settings using the authentication credentials of the
 * other user. This validates the data isolation and privacy guarantees of the system.
 */
export async function test_api_trash_settings_access_denied_foreign(
  connection: api.IConnection,
): Promise<void> {
  // Create first user account
  const firstUserConnection: api.IConnection = { host: connection.host };
  const firstUser = await api.functional.todoApp.auth.user.join(
    firstUserConnection,
    {
      body: {
        email: "user1@example.com",
        password: "password123",
        display_name: "User One",
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(firstUser);
  // Create second user account
  const secondUserConnection: api.IConnection = { host: connection.host };
  const secondUser = await api.functional.todoApp.auth.user.join(
    secondUserConnection,
    {
      body: {
        email: "user2@example.com",
        password: "password456",
        display_name: "User Two",
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(secondUser);
  // Attempt to access first user's trash settings using second user's connection
  // This should fail as users can only access their own trash settings
  await TestValidator.error(
    "access denied when retrieving foreign trash settings",
    async () => {
      await api.functional.todoApp.user.trash.settings.at(
        secondUserConnection,
        {
          settingId: "00000000-0000-0000-0000-000000000000",
        },
      );
    },
  );
}

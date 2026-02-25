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

/**
 * Test successful profile display name update.
 *
 * Workflow:
 * 1. Register a new user account
 * 2. Update the display name to a custom value
 * 3. Verify the update response contains the new display name
 */
export async function test_api_user_profile_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user-specific connection and register
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, {});
  typia.assert(authorized);
  // 2. Generate new display name and update profile
  const newDisplayName = RandomGenerator.name();
  const updatedProfile = await api.functional.todoApp.user.profile.update(
    userConnection,
    {
      body: { display_name: newDisplayName } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  // 3. Verify the display name was updated correctly
  TestValidator.equals(
    "display name should be updated",
    updatedProfile.display_name,
    newDisplayName,
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_profile_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Create new user via join
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // Update display name with valid value (1-100 characters)
  // Generate a 10-character name to ensure it's between 1-100 chars
  const newDisplayName = RandomGenerator.alphabets(10);
  const updateResponse = await api.functional.todoApp.user.profile.update(
    userConnection,
    {
      body: {
        display_name: newDisplayName,
      } satisfies ITodoAppProfile.IUpdate,
    },
  );
  typia.assert(updateResponse);
  // Verify the updated profile has correct display name and timestamps
  TestValidator.equals(
    "display name updated",
    updateResponse.display_name,
    newDisplayName,
  );
  TestValidator.predicate(
    "updated_at is ISO 8601",
    new Date(updateResponse.updated_at).toISOString() ===
      updateResponse.updated_at,
  );
  TestValidator.predicate(
    "created_at is ISO 8601",
    new Date(updateResponse.created_at).toISOString() ===
      updateResponse.created_at,
  );
}

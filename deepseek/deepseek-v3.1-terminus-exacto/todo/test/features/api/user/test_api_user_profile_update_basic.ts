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

export async function test_api_user_profile_update_basic(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user account
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(authorizedUser);
  // Update user profile with new display name
  const newDisplayName = RandomGenerator.name();
  const updatedProfile = await api.functional.todoApp.user.profile.update(
    userConnection,
    {
      body: {
        display_name: newDisplayName,
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  // Validate the profile update
  TestValidator.equals(
    "user ID remains consistent",
    updatedProfile.id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "email remains unchanged",
    updatedProfile.email,
    authorizedUser.email,
  );
  TestValidator.equals(
    "display name updated",
    updatedProfile.display_name,
    newDisplayName,
  );
  TestValidator.predicate(
    "created_at unchanged",
    updatedProfile.created_at === authorizedUser.created_at,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedProfile.updated_at,
    authorizedUser.updated_at,
  );
}

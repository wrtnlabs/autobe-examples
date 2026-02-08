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

export async function test_api_user_profile_update_display_name_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. User joins and is authorized
  const userConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: `test_${RandomGenerator.alphabets(6)}@example.com`,
    password: "strongPassword123!",
    displayName: RandomGenerator.name(2),
  } satisfies IMultiUserTodoUser.IJoin;
  const authorized = await authorize_user_join(userConnection, {
    body: joinBody,
  });
  // After authorization, set the access token header for authentication
  userConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Update display name
  const newDisplayName = RandomGenerator.name(2);
  const updateBody = {
    displayName: newDisplayName,
  } satisfies IMultiUserTodoUser.IUpdate;
  const updatedProfileUncasted =
    await api.functional.multiUserTodo.user.profile.updateProfile(
      userConnection,
      { body: updateBody },
    );
  // Validate response structure
  const updatedProfile = typia.assert<{ displayName: string; email: string }>(updatedProfileUncasted);
  // Verify that displayName is updated correctly
  TestValidator.equals(
    "displayName updated",
    updatedProfile.displayName,
    newDisplayName,
  );
  // Verify email remains unchanged
  TestValidator.equals("email unchanged", updatedProfile.email, joinBody.email);
  // Verify no password or sensitive data present
  TestValidator.predicate(
    "no password or sensitive data",
    !("password" in updatedProfile) && !("passwordHash" in updatedProfile),
  );
}

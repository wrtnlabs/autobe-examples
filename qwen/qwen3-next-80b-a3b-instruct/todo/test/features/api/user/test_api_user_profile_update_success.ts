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

export async function test_api_user_profile_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate user by joining
  const userConnection: api.IConnection = { host: connection.host };
  const authenticatedUser: ITodoAppUser.IAuthorized = await authorize_user_join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(authenticatedUser);
  // Step 2: Update user profile with new display_name
  const newDisplayName = RandomGenerator.name(1);
  const updatedProfile: ITodoAppUser.IAuthorized = typia.assert<ITodoAppUser.IAuthorized>(
    await api.functional.todoApp.user.profile.update(userConnection, {
      body: {
        display_name: newDisplayName,
      } satisfies ITodoAppUser.IUpdate,
    })
  );
  // Step 3: Validate response contains correct data
  // Verify display_name was updated
  TestValidator.equals(
    "updated display_name matches",
    updatedProfile.display_name,
    newDisplayName,
  );
  // Verify email remains unchanged
  TestValidator.equals(
    "email remains unchanged",
    updatedProfile.email,
    authenticatedUser.email,
  );
  // Verify created_at remains unchanged
  TestValidator.equals(
    "created_at remains unchanged",
    updatedProfile.created_at,
    authenticatedUser.created_at,
  );
  // Verify updated_at is new and different from original
  TestValidator.notEquals(
    "updated_at is updated",
    updatedProfile.updated_at,
    authenticatedUser.updated_at,
  );
  // Verify updated_at is a valid date-time format
  typia.assert<string & tags.Format<"date-time">>(updatedProfile.updated_at);
  // Verify id remains unchanged
  TestValidator.equals(
    "user id remains unchanged",
    updatedProfile.id,
    authenticatedUser.id,
  );
  // Verify token remains unchanged
  TestValidator.equals(
    "token remains unchanged",
    updatedProfile.token.access,
    authenticatedUser.token.access,
  );
  TestValidator.equals(
    "token refresh remains unchanged",
    updatedProfile.token.refresh,
    authenticatedUser.token.refresh,
  );
  TestValidator.equals(
    "token expired_at remains unchanged",
    updatedProfile.token.expired_at,
    authenticatedUser.token.expired_at,
  );
  TestValidator.equals(
    "token refreshable_until remains unchanged",
    updatedProfile.token.refreshable_until,
    authenticatedUser.token.refreshable_until,
  );
}
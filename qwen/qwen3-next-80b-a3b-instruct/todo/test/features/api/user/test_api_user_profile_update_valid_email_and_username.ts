import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_user_profile_update_valid_email_and_username(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create new user account
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser: ITodoAppUser.IAuthorized = await authorize_user_join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(authorizedUser);
  // Step 2: Extract user ID and original values
  const userId = authorizedUser.id;
  const originalEmail = authorizedUser.email;
  const originalUsername = authorizedUser.username;
  const originalCreatedAt = authorizedUser.created_at;
  const originalUpdatedAt = authorizedUser.updated_at;
  // Step 3: Perform empty update on user profile (IUpdate is empty object {})
  // Per DTO definition, IUpdate has no properties - so we send empty object
  const updatedUser: ITodoAppUser =
    await api.functional.todoApp.user.users.update(userConnection, {
      userId: userId,
      body: {} satisfies ITodoAppUser.IUpdate,
    });
  typia.assert(updatedUser);
  // Step 4: Validate that the response structure is correct
  TestValidator.equals("user id unchanged", updatedUser.id, userId);
  TestValidator.equals(
    "original email preserved",
    updatedUser.email,
    originalEmail,
  );
  TestValidator.equals(
    "original username preserved",
    updatedUser.username,
    originalUsername,
  );
  // Step 5: Verify updated_at timestamp was updated
  const updatedTimestamp = new Date(updatedUser.updated_at);
  const originalUpdatedAtTimestamp = new Date(originalUpdatedAt);
  TestValidator.predicate(
    "updated_at is newer than original updated_at",
    updatedTimestamp > originalUpdatedAtTimestamp,
  );
  // Step 6: Ensure created_at timestamp remained unchanged
  TestValidator.equals(
    "created_at unchanged",
    updatedUser.created_at,
    originalCreatedAt,
  );
}

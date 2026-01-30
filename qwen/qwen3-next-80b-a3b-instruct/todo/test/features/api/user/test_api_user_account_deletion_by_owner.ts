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
export async function test_api_user_account_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create new user account using the authorization utility function
  const userCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ITodoAppUser.IJoin;
  const userConnection: api.IConnection = { host: connection.host };
  const createdUser: ITodoAppUser.IAuthorized = await authorize_user_join(
    userConnection,
    { body: userCredentials },
  );
  typia.assert(createdUser);
  // Step 2: Delete the user account using the API endpoint
  // Use the created user's ID to delete their account
  const deletedUser: ITodoAppUser =
    await api.functional.todoApp.user.users.erase(userConnection, {
      userId: createdUser.id,
    });
  typia.assert(deletedUser);
  // Step 3: Validate that the returned user object matches the original user's information
  TestValidator.equals(
    "deleted user email matches",
    deletedUser.email,
    createdUser.email,
  );
  TestValidator.equals(
    "deleted user username matches",
    deletedUser.username,
    createdUser.username,
  );
  TestValidator.equals(
    "deleted user email_verified matches",
    deletedUser.email_verified,
    createdUser.email_verified,
  );
  TestValidator.equals(
    "deleted user created_at matches",
    deletedUser.created_at,
    createdUser.created_at,
  );
  TestValidator.equals(
    "deleted user updated_at matches",
    deletedUser.updated_at,
    createdUser.updated_at,
  );
  TestValidator.equals(
    "deleted user id matches",
    deletedUser.id,
    createdUser.id,
  );
}

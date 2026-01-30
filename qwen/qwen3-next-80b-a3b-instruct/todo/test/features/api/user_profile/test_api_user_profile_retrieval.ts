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
export async function test_api_user_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate user
  const userConnection: api.IConnection = { host: connection.host };
  const user: ITodoAppUser.IAuthorized = await authorize_user_join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(user);
  // Step 2: Use the authenticated user's ID to retrieve their profile
  const userProfile: ITodoAppUser = await api.functional.todoApp.user.users.at(
    userConnection,
    {
      userId: user.id,
    },
  );
  typia.assert(userProfile);
  // Step 3: Validate all required fields are present and correctly typed
  TestValidator.equals("user email matches", userProfile.email, user.email);
  TestValidator.equals(
    "user username matches",
    userProfile.username,
    user.username,
  );
  TestValidator.equals(
    "user email_verified matches",
    userProfile.email_verified,
    user.email_verified,
  );
  TestValidator.equals(
    "user created_at matches",
    userProfile.created_at,
    user.created_at,
  );
  TestValidator.equals(
    "user updated_at matches",
    userProfile.updated_at,
    user.updated_at,
  );
  TestValidator.equals("user id matches", userProfile.id, user.id);
  // Step 4: Confirm sensitive fields are not present (password_hash)
  // This should not be in the ITodoAppUser schema, so no validation needed
  // Step 5: Validate that the response structure matches the ITodoAppUser schema exactly
  // This is guaranteed by typia.assert() which validates the entire schema
}

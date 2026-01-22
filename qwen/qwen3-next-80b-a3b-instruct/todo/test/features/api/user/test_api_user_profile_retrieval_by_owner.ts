import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoListToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_user_profile_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate user
  const userConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string &
          tags.Pattern<"[a-zA-Z0-9!@#$%^&*()_+\-={}:\\\\;\\\\[\\\\]\\\\|,.<>?/\\\\s]{8,}">
      >(),
    } satisfies ITodoListUser.IJoin,
  });
  typia.assert(authResult);
  // Step 2: Use the authenticated connection to retrieve own profile
  const userProfile = await api.functional.todoList.users.at(userConnection, {
    userId: authResult.id,
  });
  typia.assert(userProfile);
  // Step 3: Validate retrieved profile contains correct information
  TestValidator.equals("user ID matches", userProfile.id, authResult.id);
  TestValidator.equals(
    "user email matches",
    userProfile.email,
    authResult.email,
  );
  TestValidator.equals(
    "user created at matches",
    userProfile.createdAt,
    authResult.createdAt,
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_user_status_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create new user using authorization function
  const user = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string>(),
      name: RandomGenerator.name(),
    } satisfies ITodoUser.IJoin,
  });
  // Verify profile status endpoint returns correct user data
  const profile = await api.functional.auth.user.status(connection);
  typia.assert(profile);
  // Validate all expected profile information matches
  TestValidator.equals("user id matches", user.id, profile.id);
  TestValidator.equals("user email matches", user.email, profile.email);
  TestValidator.equals("user name matches", user.name, profile.name);
  TestValidator.equals(
    "user created at matches",
    user.createdAt,
    profile.createdAt,
  );
  TestValidator.equals(
    "user updated at matches",
    user.updatedAt,
    profile.updatedAt,
  );
}

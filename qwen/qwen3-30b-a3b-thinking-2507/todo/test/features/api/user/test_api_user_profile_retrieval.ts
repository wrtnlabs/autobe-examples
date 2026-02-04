import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_user_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Register a new user account
  const userRegistrationConnection: api.IConnection = { host: connection.host };
  const registrationPassword = RandomGenerator.alphaNumeric(16);
  const user = await authorize_user_join(userRegistrationConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: registrationPassword,
    } satisfies ITodoUser.IJoin,
  });
  // Login with the user's credentials
  const loginConnection: api.IConnection = { host: connection.host };
  await authorize_user_login(loginConnection, {
    body: {
      email: user.email,
      password: registrationPassword,
      href: "http://test.com",
      referrer: "http://test.com",
    } satisfies ITodoUser.ILogin,
  });
  // Retrieve the user profile
  const profile: ITodoUser.ISummary = await api.functional.todo.user.users.at(
    loginConnection,
    {
      userId: user.id,
    },
  );
  // Validate response
  typia.assert(profile);
  // Verify identity
  TestValidator.equals("profile ID matches user ID", profile.id, user.id);
  TestValidator.equals(
    "display name matches expected",
    profile.display_name,
    user.displayName,
  );
}

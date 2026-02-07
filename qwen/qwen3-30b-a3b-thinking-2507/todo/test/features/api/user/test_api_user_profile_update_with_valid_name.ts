import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoProfile";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_profile_update_with_valid_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration
  const userRegistrationConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userRegistrationConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies ITodoUser.IJoin,
  });
  // 2. Create connection for profile update
  const userConnection: api.IConnection = { host: connection.host };
  // Copy the token from registration connection to user connection
  userConnection.headers = userRegistrationConnection.headers;
  // 3. Generate 10-character alphanumeric name
  const newName = RandomGenerator.alphaNumeric(10);
  // 4. Update profile
  const updatedProfile = await api.functional.todo.user.profile.update(
    userConnection,
    {
      body: { display_name: newName },
    },
  );
  typia.assert(updatedProfile);
  // 5. Validate
  TestValidator.equals(
    "name matches input",
    updatedProfile.display_name,
    newName,
  );
}

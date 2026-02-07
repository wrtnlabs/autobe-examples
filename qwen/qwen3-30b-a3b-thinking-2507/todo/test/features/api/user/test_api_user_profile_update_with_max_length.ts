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

export async function test_api_user_profile_update_with_max_length(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register user through utility function
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: typia.random<ITodoUser.IJoin>(),
  });
  // 2. Generate 20-character alphanumeric string
  const expectedDisplayName: string = RandomGenerator.alphaNumeric(20);
  // 3. Update user profile
  const profileResponse: ITodoProfile =
    await api.functional.todo.user.profile.update(userConnection, {
      body: {
        display_name: expectedDisplayName,
      } satisfies ITodoProfile.IUpdate,
    });
  typia.assert(profileResponse);
  // 4. Verify response has the exactly the same display name
  TestValidator.equals(
    "display name matches",
    profileResponse.display_name,
    expectedDisplayName,
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_profile_update_forbidden_character(
  connection: api.IConnection,
): Promise<void> {
  // Create user via join
  const userConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(authResponse);
  // Set initial display name
  const initialDisplayName = RandomGenerator.name();
  const initialProfile = await api.functional.todoApp.user.profile.update(
    userConnection,
    {
      body: {
        display_name: initialDisplayName,
      } satisfies ITodoAppProfile.IUpdate,
    },
  );
  typia.assert(initialProfile);
  // Attempt update with forbidden character
  const forbiddenDisplayName = "John & Doe";
  await TestValidator.httpError(
    "should reject display name with forbidden character",
    400,
    async () => {
      await api.functional.todoApp.user.profile.update(userConnection, {
        body: {
          display_name: forbiddenDisplayName,
        } satisfies ITodoAppProfile.IUpdate,
      });
    },
  );
  // Retrieve profile again after failed update
  const afterFailureProfile = await api.functional.todoApp.user.profile.update(
    userConnection,
    {
      body: {
        display_name: initialDisplayName,
      } satisfies ITodoAppProfile.IUpdate,
    },
  );
  typia.assert(afterFailureProfile);
  // Verify profile unchanged after failed update
  TestValidator.equals(
    "profile unchanged after failed update",
    afterFailureProfile.display_name,
    initialProfile.display_name,
  );
}

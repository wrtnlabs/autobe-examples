import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_password_change_weak_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user
  const userConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    username: RandomGenerator.name(2),
  } satisfies IRedditPlatformUser.IJoin;
  const authorized = await authorize_user_join(userConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  // 2. Try to change password to weak password
  const weakPassword = "1234"; // Weak password
  await TestValidator.error("weak password should be rejected", async () => {
    await api.functional.redditPlatform.user.password.updatePassword(
      userConnection,
      {
        body: {
          current_password: joinInput.password,
          new_password: weakPassword,
        } satisfies IRedditPlatformUser.IRequest,
      },
    );
  });
}

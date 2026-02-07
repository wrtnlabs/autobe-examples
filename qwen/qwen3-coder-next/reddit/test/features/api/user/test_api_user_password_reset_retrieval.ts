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

export async function test_api_user_password_reset_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // Register a new user
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IRedditPlatformUser.IJoin,
  });
  typia.assert(user);
  // Test retrieving a non-existent password reset record
  // This tests the error handling path for invalid reset IDs
  await TestValidator.error("password reset not found", async () => {
    await api.functional.redditPlatform.user.password_resets.at(
      userConnection,
      {
        resetId: "00000000-0000-0000-0000-000000000000",
      },
    );
  });
  // Test with valid UUID format but non-existent record
  await TestValidator.error(
    "password reset not found for random UUID",
    async () => {
      await api.functional.redditPlatform.user.password_resets.at(
        userConnection,
        {
          resetId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}

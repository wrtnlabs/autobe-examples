import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import type { IRedditPlatformUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_password_reset_request(
  connection: api.IConnection,
): Promise<void> {
  // Create a new user for testing
  const newUserConnection: api.IConnection = { host: connection.host };
  const userConnection: api.IConnection = { host: connection.host };
  const userEmail = typia.random<string & tags.Format<"email">>();
  // Register a new user
  await authorize_user_join(newUserConnection, {
    body: {
      email: userEmail,
      password: "TestPassword123!",
      username: RandomGenerator.name(3),
    } satisfies IRedditPlatformUser.IJoin,
  });
  // Login as the user to get authentication context
  await authorize_user_login(userConnection, {
    body: {
      email: userEmail,
      password: "TestPassword123!",
    } satisfies IRedditPlatformUser.ILogin,
  });
  // Test password reset request
  // The DTO is an empty object, so we pass an empty object
  const resetResult =
    await api.functional.redditPlatform.user.password_resets.requestPasswordReset(
      userConnection,
      {
        body: {} satisfies IRedditPlatformUserPasswordReset,
      },
    );
  typia.assert(resetResult);
  // Verify the response structure is correct
  // Since the DTO is defined as an empty object, we verify it's truly empty
  typia.assertEquals(resetResult);
}

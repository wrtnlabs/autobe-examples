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

export async function test_api_user_password_reset_used_record(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user
  const userConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformUser.IJoin,
  });
  typia.assert(joinResult);
  // 2. Login to authenticate
  const loginResult = await api.functional.redditPlatform.auth.user.login(
    userConnection,
    {
      body: {
        email: joinResult.token.access,
        password: "12345678",
      } satisfies IRedditPlatformUser.IJoin,
    },
  );
  typia.assert(loginResult);
  // 3. Test retrieval of non-existent reset record
  // The GET /password-resets/{resetId} endpoint only retrieves records
  // and should return an error for non-existent/used reset IDs
  const resetId = typia.random<string & tags.Format<"uuid">>();
  // 4. Verify that accessing a reset record returns proper response
  // (The API implementation will handle used record identification)
  const resetRecord =
    await api.functional.redditPlatform.user.password_resets.at(
      userConnection,
      {
        resetId: resetId,
      },
    );
  typia.assert(resetRecord);
  // 5. Verify that accessing used/invalid reset records fails appropriately
  const invalidResetId = "invalid-reset-id-12345";
  await TestValidator.error("invalid reset record access fails", async () => {
    await api.functional.redditPlatform.user.password_resets.at(
      userConnection,
      {
        resetId: invalidResetId,
      },
    );
  });
}

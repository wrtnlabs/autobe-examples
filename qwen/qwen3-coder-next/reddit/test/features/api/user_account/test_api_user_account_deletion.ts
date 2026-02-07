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

export async function test_api_user_account_deletion(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account using utility function
  const userConnection: api.IConnection = { host: connection.host };
  const joinResponse = await api.functional.redditPlatform.auth.user.join(
    userConnection,
    {
      body: typia.random<IRedditPlatformUser.IJoin>(),
    },
  );
  typia.assert(joinResponse);
  // Step 2: Store the token for later validation
  const originalToken = joinResponse.token.access;
  // Step 3: Call DELETE endpoint to delete user account
  const deleteResponse =
    await api.functional.redditPlatform.user.account.erase(userConnection);
  typia.assert(deleteResponse);
  // Step 4: Verify authentication tokens are invalidated by attempting to use the same token
  // Create new connection with the same token
  const invalidConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: originalToken,
    },
  };
  // Should fail with unauthorized error
  await TestValidator.error(
    "deleted user cannot access protected endpoint",
    async () => {
      await api.functional.redditPlatform.user.account.erase(invalidConnection);
    },
  );
  // Step 5: Verify the delete response is valid
  typia.assert(deleteResponse);
}

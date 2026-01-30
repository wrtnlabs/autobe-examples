import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicForumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumUser";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_user_logout(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for the user
  const userConnection: api.IConnection = { host: connection.host };
  // Use authorization utility function to join as a new user
  const user: IEconomicForumUser.IAuthorized = await authorize_user_join(
    userConnection,
    {
      body: {},
    },
  );
  // Verify successful join
  typia.assert(user);
  // Assert that the user has a valid token
  TestValidator.predicate("user has access token", Boolean(user.token.access));
  TestValidator.predicate(
    "user has refresh token",
    Boolean(user.token.refresh),
  );
  // Save the old token for later testing
  const oldAccessToken = user.token.access;
  // Use the same userConnection to logout - this will clear the connection's authorization header
  await api.functional.economicForum.user.auth.users.logout.erase(
    userConnection,
  );
  // Create a NEW connection object with stale access token (simulating client not clearing token)
  const staleTokenConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${oldAccessToken}` },
  };
  // Attempt to use the stale (revoked) access token in a new connection
  // This should fail since the server has revoked the token
  await TestValidator.error(
    "access token invalidated after logout",
    async () => {
      await api.functional.economicForum.user.auth.users.logout.erase(
        staleTokenConnection,
      );
    },
  );
}

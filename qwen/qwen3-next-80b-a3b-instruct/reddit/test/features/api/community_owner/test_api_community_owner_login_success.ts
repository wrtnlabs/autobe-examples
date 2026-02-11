import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";

export async function test_api_community_owner_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new community owner account with random credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_community_owner_join(joinConnection, {
    body: {
      email,
      password,
    } satisfies IRedditCommunityCommunityOwner.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Log in with the same credentials used for account creation
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_community_owner_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies IRedditCommunityCommunityOwner.ILogin,
  });
  typia.assert(loginResponse);
  // 3. Validate the login response structure
  TestValidator.equals(
    "access token exists",
    typeof loginResponse.token.access,
    "string",
  );
  TestValidator.predicate(
    "access token is not empty",
    () => loginResponse.token.access.length > 0,
  );
  TestValidator.equals(
    "refresh token exists",
    typeof loginResponse.token.refresh,
    "string",
  );
  TestValidator.predicate(
    "refresh token is not empty",
    () => loginResponse.token.refresh.length > 0,
  );
  // 4. Verify that the connection headers contain the access token for subsequent requests
  TestValidator.equals(
    "Authorization header set",
    loginConnection.headers?.Authorization,
    loginResponse.token.access,
  );
}

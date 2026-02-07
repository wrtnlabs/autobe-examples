import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create moderator account
  const adminConnection: api.IConnection = { host: connection.host };
  const moderatorJoinData: IRedditPlatformModerator.IJoin = {};
  const joinedModerator = await authorize_moderator_join(adminConnection, {
    body: moderatorJoinData,
  });
  typia.assert(joinedModerator);
  // Step 2: Login with the created moderator credentials
  const moderatorLoginData: IRedditPlatformModerator.ILogin = {};
  const loginResponse = await authorize_moderator_login(adminConnection, {
    body: moderatorLoginData,
  });
  typia.assert(loginResponse);
  // Step 3: Verify token structure
  typia.assert<IAuthorizationToken>(loginResponse.token);
  // Step 4: Verify token properties exist and have correct format
  TestValidator.predicate(
    "access token exists",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    loginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid ISO string",
    loginResponse.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO string",
    loginResponse.token.refreshable_until.length > 0,
  );
}

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

export async function test_api_user_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create actor-specific connections
  const userConnection: api.IConnection = { host: connection.host };
  // Execute: Register a new user with valid credentials
  const registrationData = typia.random<IRedditPlatformUser.IJoin>();
  const result = await authorize_user_join(userConnection, {
    body: registrationData,
  });
  // Validate: Check the response structure and data integrity
  typia.assert(result);
  // Verify authentication tokens are present
  TestValidator.predicate("access token exists", () => !!result.token.access);
  TestValidator.predicate("refresh token exists", () => !!result.token.refresh);
  TestValidator.predicate("expiration time is in future", () => {
    const now = new Date().getTime();
    const expires = new Date(result.token.expired_at).getTime();
    return expires > now;
  });
  TestValidator.predicate("refreshable until is in future", () => {
    const now = new Date().getTime();
    const refreshable = new Date(result.token.refreshable_until).getTime();
    return refreshable > now;
  });
  // Verify connection headers were updated with access token
  TestValidator.predicate("connection has authorization header", () => {
    return userConnection.headers?.Authorization === result.token.access;
  });
}

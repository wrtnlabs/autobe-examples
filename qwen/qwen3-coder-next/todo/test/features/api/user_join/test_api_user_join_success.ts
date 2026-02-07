import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for registration
  const userConnection: api.IConnection = { host: connection.host };
  // Generate test user data
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = "SecureP@ss123";
  const testName = RandomGenerator.name();
  // Register new user
  const result = await authorize_user_join(userConnection, {
    body: {
      email: testEmail,
      password: testPassword,
      name: testName,
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(result);
  // Validate response structure
  TestValidator.predicate(
    "has valid access token",
    result.token.access.length > 0,
  );
  TestValidator.predicate(
    "has valid refresh token",
    result.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has valid expiration",
    new Date(result.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "has valid refreshable_until",
    new Date(result.token.refreshable_until) > new Date(),
  );
  // Validate token expiration times are reasonable
  const expiredDate = new Date(result.token.expired_at);
  const refreshableDate = new Date(result.token.refreshable_until);
  TestValidator.predicate(
    "access token expires within reasonable time",
    expiredDate.getTime() - new Date().getTime() <= 24 * 60 * 60 * 1000, // 24 hours max
  );
  TestValidator.predicate(
    "refresh token valid for longer period",
    refreshableDate > expiredDate,
  );
}

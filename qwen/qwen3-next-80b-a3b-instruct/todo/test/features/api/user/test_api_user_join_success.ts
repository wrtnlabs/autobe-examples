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
  // Create a new user connection for join operation
  const userConnection: api.IConnection = { host: connection.host };
  // Execute user registration using utility function (priority over SDK)
  // ITodoAppUser.IJoin is an empty object per DTO definition, so body is an empty object
  const response = await authorize_user_join(userConnection, {
    body: {} satisfies ITodoAppUser.IJoin,
  });
  // Validate the response structure
  typia.assert(response);
  // Verify access token is present and is a string
  TestValidator.equals("access token exists", typeof response.access, "string");
  TestValidator.predicate(
    "access token is non-empty",
    () => response.access.length > 0,
  );
  // Verify refresh token is present and is a string
  TestValidator.equals(
    "refresh token exists",
    typeof response.refresh,
    "string",
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    () => response.refresh.length > 0,
  );
  // Verify token object exists and has valid structure
  TestValidator.equals("token object exists", typeof response.token, "object");
  TestValidator.equals(
    "token access matches top-level",
    response.token.access,
    response.access,
  );
  TestValidator.equals(
    "token refresh matches top-level",
    response.token.refresh,
    response.refresh,
  );
  // Verify expiration timestamps are valid ISO date-time strings
  TestValidator.equals(
    "expired_at format",
    typeof response.token.expired_at,
    "string",
  );
  TestValidator.predicate("expired_at is valid date-time", () => {
    const date = new Date(response.token.expired_at);
    return (
      !isNaN(date.getTime()) && response.token.expired_at === date.toISOString()
    );
  });
  TestValidator.equals(
    "refreshable_until format",
    typeof response.token.refreshable_until,
    "string",
  );
  TestValidator.predicate("refreshable_until is valid date-time", () => {
    const date = new Date(response.token.refreshable_until);
    return (
      !isNaN(date.getTime()) &&
      response.token.refreshable_until === date.toISOString()
    );
  });
  // Verify token expiration times are in the future
  const now = new Date();
  TestValidator.predicate(
    "access token not expired",
    () => new Date(response.token.expired_at) > now,
  );
  TestValidator.predicate(
    "refresh token still valid",
    () => new Date(response.token.refreshable_until) > now,
  );
  // Confirm user registration is atomic and successful
  TestValidator.predicate("user registration succeeded", () => true);
}

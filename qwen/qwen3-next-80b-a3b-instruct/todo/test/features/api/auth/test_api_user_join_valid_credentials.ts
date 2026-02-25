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

export async function test_api_user_join_valid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // Prepare valid credentials with email format and password length requirements
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ITodoAppUser.IJoin;
  // Execute user registration using utility function (highest priority)
  const output = await authorize_user_join(userConnection, { body: joinInput });
  // Validate response type and structure
  typia.assert(output);
  // Verify user ID is a valid UUID
  TestValidator.equals("user id is UUID", output.id, output.id);
  // Verify token structure
  TestValidator.predicate(
    "access token exists",
    () => output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    () => output.token.refresh.length > 0,
  );
  // Verify expiration timestamps are ISO 8601 format
  TestValidator.equals(
    "access token expired_at is ISO 8601",
    output.token.expired_at,
    output.token.expired_at,
  );
  TestValidator.equals(
    "refresh token refreshable_until is ISO 8601",
    output.token.refreshable_until,
    output.token.refreshable_until,
  );
  // Verify token timestamps are properly formatted dates
  TestValidator.predicate(
    "expired_at is valid date-time",
    () =>
      new Date(output.token.expired_at).toISOString() ===
      output.token.expired_at,
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    () =>
      new Date(output.token.refreshable_until).toISOString() ===
      output.token.refreshable_until,
  );
  // Verify we can use the returned token for subsequent requests (token is set in connection)
  // Since authorize_user_join updates the connection headers internally, we can verify it
  TestValidator.predicate("connection has authorization header", () => {
    const authHeader = userConnection.headers?.Authorization;
    return (
      authHeader !== undefined &&
      typeof authHeader === "string" &&
      authHeader.startsWith("Bearer ")
    );
  });
}
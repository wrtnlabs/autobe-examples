import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_join_with_valid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // Generate valid test credentials
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ITodoAppMemberSession.IJoin;
  // Execute member join API call
  const response = await api.functional.todoApp.auth.member.join(connection, {
    body: joinInput,
  });
  // Validate response structure
  typia.assert(response);
  // Verify JWT token structure
  TestValidator.predicate(
    "access_token exists",
    () => response.access_token.length > 0,
  );
  TestValidator.predicate(
    "refresh_token exists",
    () => response.refresh_token.length > 0,
  );
  // Validate token expiration timestamps
  TestValidator.predicate(
    "access_expires_at is valid date-time",
    () => !isNaN(Date.parse(response.access_expires_at)),
  );
  TestValidator.predicate(
    "refresh_expires_at is valid date-time",
    () => !isNaN(Date.parse(response.refresh_expires_at)),
  );
  // Validate member session information
  TestValidator.equals("session has valid id", typeof response.id, "string");
  TestValidator.equals("user has valid id", typeof response.user.id, "string");
  TestValidator.equals(
    "user has valid member id",
    typeof response.user.todo_app_member_id,
    "string",
  );
  // Validate token structure
  typia.assert<IAuthorizationToken>(response.token);
  // Validate timestamps are properly formatted
  TestValidator.predicate(
    "last_used_at is valid date-time or null",
    () =>
      response.user.last_used_at === null ||
      !isNaN(Date.parse(response.user.last_used_at)),
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    () => !isNaN(Date.parse(response.user.created_at)),
  );
}

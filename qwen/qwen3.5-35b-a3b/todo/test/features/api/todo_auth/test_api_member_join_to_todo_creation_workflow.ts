import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_join_to_todo_creation_workflow(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Generate registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // Step 2: Register member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: ITodoAppMember.IAuthorized =
    await api.functional.todoApp.auth.member.join(memberConnection, {
      body: {
        email,
        password,
        displayName,
        href,
        referrer,
        ip,
      } satisfies ITodoAppMember.IJoin,
    });
  typia.assert(authorized);
  // Step 3: Validate response structure
  TestValidator.equals("email matches input", authorized.email, email);
  TestValidator.equals(
    "display name matches",
    authorized.display_name,
    displayName,
  );
  TestValidator.equals(
    "deleted_at is null for active account",
    authorized.deleted_at,
    null,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    () => !isNaN(new Date(authorized.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    () => !isNaN(new Date(authorized.updated_at).getTime()),
  );
  // Step 4: Validate token structure
  typia.assert(authorized.token);
  TestValidator.predicate(
    "access token exists and has content",
    () => authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists and has content",
    () => authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    () => !isNaN(new Date(authorized.token.expired_at).getTime()),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    () => !isNaN(new Date(authorized.token.refreshable_until).getTime()),
  );
  // Step 5: Test token expiration timing
  const expiredAtDate = new Date(authorized.token.expired_at);
  const refreshableUntilDate = new Date(authorized.token.refreshable_until);
  const now = new Date();
  TestValidator.predicate(
    "access token expired_at is in the future",
    () => expiredAtDate > now,
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    () => refreshableUntilDate > now,
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    () => refreshableUntilDate > expiredAtDate,
  );
  // Step 6: Create authorized connection with token
  const authorizedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorized.token.access}`,
    },
  };
  // Step 7: Verify token header is correctly formatted
  TestValidator.equals(
    "Authorization header uses Bearer scheme",
    authorizedConnection.headers?.Authorization,
    `Bearer ${authorized.token.access}`,
  );
}

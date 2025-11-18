import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";

export async function test_api_member_user_join_records_session_context(
  connection: api.IConnection,
) {
  // Prepare a guest-style connection that does not carry prior auth headers
  const guestConnection: api.IConnection = { ...connection, headers: {} };

  // Build registration request body with explicit session metadata
  const requestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: "203.0.113.42",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  // Execute join as an unauthenticated guest
  const authorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(guestConnection, {
      body: requestBody,
    });

  // Structural type validation
  typia.assert<ITodoAppMemberuser.IAuthorized>(authorized);

  // Business-level validations around authorization context
  TestValidator.predicate(
    "failed_login_count is zero after join",
    authorized.failed_login_count === 0,
  );

  TestValidator.predicate("member id is non-empty", authorized.id.length > 0);

  TestValidator.predicate(
    "authorized token.access is non-empty",
    authorized.token.access.length > 0,
  );

  TestValidator.predicate(
    "authorized token.refresh is non-empty",
    authorized.token.refresh.length > 0,
  );
}

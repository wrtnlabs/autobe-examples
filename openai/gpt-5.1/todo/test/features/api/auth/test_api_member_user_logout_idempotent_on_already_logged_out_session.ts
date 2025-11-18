import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogout } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogout";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";

export async function test_api_member_user_logout_idempotent_on_already_logged_out_session(
  connection: api.IConnection,
) {
  // 1. Register a member user and obtain authorized context (and token via side effect).
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    // Let server infer IP or treat null as "unknown" client IP.
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const authorized = await api.functional.auth.memberUser.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);
  typia.assert(authorized.token);

  // 2. First logout should succeed and terminate the current session.
  const firstLogout = await api.functional.auth.memberUser.logout(connection);
  typia.assert(firstLogout);

  TestValidator.predicate(
    "first logout call should report success",
    firstLogout.success === true,
  );

  // 3. Second logout with the same connection should be safe and not cause server errors.
  // If the backend treats already-expired sessions as success, success may still be true.
  // If it treats them as unauthenticated, the SDK would throw an HttpError and this test fails,
  // surfacing non-idempotent behavior.
  const secondLogout = await api.functional.auth.memberUser.logout(connection);
  typia.assert(secondLogout);
}

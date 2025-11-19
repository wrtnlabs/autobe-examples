import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

export async function test_api_admin_login_with_valid_credentials(
  connection: api.IConnection,
) {
  // 1. Register a new administrator account via join endpoint
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
  } satisfies IDiscussionBoardAdmin.IJoin;

  const authorized: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(authorized);
  TestValidator.predicate(
    "join returns valid authorization token",
    authorized.token !== null &&
      authorized.token !== undefined &&
      typeof authorized.token.access === "string" &&
      typeof authorized.token.refresh === "string",
  );

  // 2. Login with the newly registered admin credentials
  const loginBody = {
    username: joinBody.email,
    password: joinBody.password,
    href: "https://example.com/admin/login",
    referrer: "https://example.com/admin",
  } satisfies IDiscussionBoardAdmin.ILogin;

  const loginAuthorized: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: loginBody });
  typia.assert(loginAuthorized);
  TestValidator.predicate(
    "login returns valid authorization token",
    loginAuthorized.token !== null &&
      loginAuthorized.token !== undefined &&
      typeof loginAuthorized.token.access === "string" &&
      typeof loginAuthorized.token.refresh === "string",
  );
}

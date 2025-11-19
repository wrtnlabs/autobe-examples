import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

export async function test_api_admin_login_existing(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin user using the join endpoint
  const email = typia.random<string & tags.Format<"email">>();
  const password = "password123";
  const nickname = RandomGenerator.name();

  const adminJoinResponse: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: email,
        password: password,
        nickname: nickname,
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(adminJoinResponse);

  // Validate the join response properties
  TestValidator.predicate(
    "admin join gives valid id",
    typeof adminJoinResponse.id === "string" && adminJoinResponse.id.length > 0,
  );
  TestValidator.equals(
    "admin join gives email",
    adminJoinResponse.email,
    email,
  );
  TestValidator.equals(
    "admin join gives nickname",
    adminJoinResponse.nickname,
    nickname,
  );
  typia.assert(adminJoinResponse.token);

  // Step 2: Login with the registered admin credentials
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const adminLoginResponse: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        username: email,
        password: password,
        href: href,
        referrer: referrer,
      } satisfies IDiscussionBoardAdmin.ILogin,
    });
  typia.assert(adminLoginResponse);

  // Validate the login response properties
  TestValidator.predicate(
    "admin login gives valid id",
    typeof adminLoginResponse.id === "string" &&
      adminLoginResponse.id.length > 0,
  );
  TestValidator.equals(
    "admin login email matches join",
    adminLoginResponse.email,
    email,
  );
  TestValidator.predicate(
    "admin login token has access",
    typeof adminLoginResponse.token.access === "string" &&
      adminLoginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "admin login token has refresh",
    typeof adminLoginResponse.token.refresh === "string" &&
      adminLoginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expired_at is valid date",
    Boolean(Date.parse(adminLoginResponse.token.expired_at)),
  );
  TestValidator.predicate(
    "token refreshable_until is valid date",
    Boolean(Date.parse(adminLoginResponse.token.refreshable_until)),
  );
}

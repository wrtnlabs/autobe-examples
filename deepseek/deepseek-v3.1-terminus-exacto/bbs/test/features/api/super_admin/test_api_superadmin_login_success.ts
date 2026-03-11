import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new super admin connection for account creation
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Generate credentials once for consistent use
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // First, create a super admin account using the join utility function
  const joinResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email,
      password,
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(joinResult);
  // Create a new connection for login (base connection should not be used directly)
  const loginConnection: api.IConnection = { host: connection.host };
  // Perform login with the same credentials used for join
  const loginResult = await authorize_super_admin_login(loginConnection, {
    body: {
      email,
      password,
      href: "https://example.com/dashboard" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  typia.assert(loginResult);
  // Validate business logic (not type validation - typia.assert already handles types)
  TestValidator.equals("email should match input", loginResult.email, email);
  TestValidator.equals(
    "admin grade should be set",
    loginResult.admin_grade,
    "super",
  );
  // Validate token expiration logic (business rule)
  const expiredAt = new Date(loginResult.token.expired_at);
  const refreshableUntil = new Date(loginResult.token.refreshable_until);
  TestValidator.predicate(
    "token should expire before refresh deadline",
    expiredAt < refreshableUntil,
  );
}

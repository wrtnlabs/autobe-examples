import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account first
  const adminConnection: api.IConnection = { host: connection.host };
  void await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "SecurePass123!",
      display_name: "Admin User",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Login with admin credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const output = await authorize_admin_login(loginConnection, {
    body: {
      email: "admin@test.com",
      password: "SecurePass123!",
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  typia.assert(output);
  // 3. Validate admin profile information
  TestValidator.equals("admin id exists", typeof output.id, "string");
  TestValidator.equals(
    "display name matches",
    output.display_name,
    "Admin User",
  );
  TestValidator.equals("email matches", output.email, "admin@test.com");
  TestValidator.equals("is_super_admin is false", output.is_super_admin, false);
  TestValidator.equals("is_active is true", output.is_active, true);
  // 4. Validate token structure
  TestValidator.equals(
    "access token exists",
    typeof output.token.access,
    "string",
  );
  TestValidator.equals(
    "refresh token exists",
    typeof output.token.refresh,
    "string",
  );
  TestValidator.equals(
    "expired_at is ISO date",
    output.token.expired_at,
    new Date(output.token.expired_at).toISOString(),
  );
  TestValidator.equals(
    "refreshable_until is ISO date",
    output.token.refreshable_until,
    new Date(output.token.refreshable_until).toISOString(),
  );
}
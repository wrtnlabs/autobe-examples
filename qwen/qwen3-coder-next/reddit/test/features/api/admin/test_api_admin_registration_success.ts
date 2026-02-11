import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection for registration
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate valid admin registration data with secure password
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // 12 characters to satisfy min 8
    username: RandomGenerator.name(),
    display_name: RandomGenerator.name(),
    bio: null,
  } satisfies IRedditPlatformAdmin.IJoin;
  // Register new admin account
  const admin = await authorize_admin_join(adminConnection, {
    body: body,
  });
  // Validate admin response structure
  typia.assert(admin);
  // Verify essential fields are present
  TestValidator.equals("email matches", admin.email, body.email);
  TestValidator.equals("username matches", admin.username, body.username);
  TestValidator.equals(
    "display_name matches",
    admin.displayName,
    body.display_name,
  );
  TestValidator.equals("bio is null", admin.bio, null);
  TestValidator.predicate("karma_score is valid", admin.karmaScore >= 0);
  TestValidator.predicate("has valid UUID", /^[0-9a-f-]{36}$/i.test(admin.id));
  TestValidator.predicate("has valid token", admin.token.access.length > 0);
  TestValidator.predicate(
    "has valid refresh token",
    admin.token.refresh.length > 0,
  );
}

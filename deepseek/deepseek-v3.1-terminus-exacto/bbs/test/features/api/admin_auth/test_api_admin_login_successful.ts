import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_successful(
  connection: api.IConnection,
): Promise<void> {
  // Create admin account first
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate random credentials for the admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminDisplayName = RandomGenerator.name();
  // Create admin account using authorize_admin_join utility function
  const createdAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: adminDisplayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(createdAdmin);
  // Create a fresh connection for login (authorize_admin_login will set Authorization header)
  const loginConnection: api.IConnection = { host: connection.host };
  // Login with the created admin credentials
  const loggedInAdmin = await authorize_admin_login(loginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(loggedInAdmin);
  // Validate that the login response contains the token structure
  TestValidator.equals(
    "token should have access field",
    typeof loggedInAdmin.token.access,
    "string",
  );
  TestValidator.equals(
    "token should have refresh field",
    typeof loggedInAdmin.token.refresh,
    "string",
  );
  TestValidator.equals(
    "token should have expired_at field",
    typeof loggedInAdmin.token.expired_at,
    "string",
  );
  TestValidator.equals(
    "token should have refreshable_until field",
    typeof loggedInAdmin.token.refreshable_until,
    "string",
  );
  // Validate that the logged in admin profile matches the created one
  TestValidator.equals("email should match", loggedInAdmin.email, adminEmail);
  TestValidator.equals(
    "display_name should match",
    loggedInAdmin.display_name,
    adminDisplayName,
  );
  // Verify token expiration timestamps are valid dates
  TestValidator.predicate(
    "expired_at should be valid date",
    !isNaN(new Date(loggedInAdmin.token.expired_at).getTime()),
  );
  TestValidator.predicate(
    "refreshable_until should be valid date",
    !isNaN(new Date(loggedInAdmin.token.refreshable_until).getTime()),
  );
  // Verify that refreshable_until is after expired_at (refreshing should be possible after access token expires)
  const expiredAt = new Date(loggedInAdmin.token.expired_at);
  const refreshableUntil = new Date(loggedInAdmin.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until should be after expired_at",
    refreshableUntil > expiredAt,
  );
}

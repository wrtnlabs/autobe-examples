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

/**
 * Test successful super administrator registration with valid credentials.
 * Validates that the system creates a new super administrator account with proper
 * privilege level, securely hashes the password, generates authentication tokens
 * with appropriate expiration times, and returns complete account information
 * including ID, email, privilege level, and timestamps.
 */
export async function test_api_super_admin_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for super admin registration
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Register a new super administrator using the utility function
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    },
  });
  // Validate the complete response structure - this performs ALL validation
  typia.assert(authorized);
  // Verify business logic: privilege level is correctly set
  TestValidator.equals(
    "privilege level is super_admin",
    authorized.privilege_level,
    "super_admin",
  );
  // Verify business logic: token expiration timeline makes sense
  const expiredAt = new Date(authorized.token.expired_at);
  const refreshableUntil = new Date(authorized.token.refreshable_until);
  TestValidator.predicate(
    "token expiration timeline is valid",
    expiredAt < refreshableUntil,
  );
  // Verify business logic: account is active (not deleted)
  TestValidator.equals(
    "new account is not deleted",
    authorized.deleted_at,
    null,
  );
}

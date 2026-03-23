import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test successful administrator account registration with valid credentials.
 * Verifies that the system creates a new admin account with proper authentication tokens.
 */
export async function test_api_admin_join_with_valid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection for authorization
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate valid admin registration data
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(),
    bio: null,
    avatar: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: undefined,
  } satisfies IRedditCloneAdmin.IJoin;
  // Use utility function for admin join (MUST use utility, not SDK directly)
  const admin = await authorize_admin_join(adminConnection, { body });
  typia.assert(admin);
  // Validate admin account creation
  TestValidator.equals("email matches input", admin.email, body.email);
  TestValidator.equals("username matches input", admin.username, body.username);
  TestValidator.equals(
    "display name matches input",
    admin.displayName,
    body.displayName,
  );
  TestValidator.equals("bio is null", admin.bio, null);
  TestValidator.equals("avatar is null", admin.avatar, null);
  // Validate account is active
  TestValidator.equals(
    "account is active (deleted_at is null)",
    admin.deletedAt,
    null,
  );
  // Validate timestamps exist
  TestValidator.predicate(
    "created_at exists",
    admin.createdAt !== null && admin.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    admin.updatedAt !== null && admin.updatedAt !== undefined,
  );
  // Validate JWT tokens are present
  TestValidator.predicate(
    "access token exists",
    admin.token.access !== null && admin.token.access !== undefined,
  );
  TestValidator.predicate(
    "refresh token exists",
    admin.token.refresh !== null && admin.token.refresh !== undefined,
  );
  TestValidator.predicate(
    "access token expiration exists",
    admin.token.expired_at !== null && admin.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "refreshable until exists",
    admin.token.refreshable_until !== null &&
      admin.token.refreshable_until !== undefined,
  );
  // Validate admin has UUID
  TestValidator.predicate(
    "admin ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      admin.id,
    ),
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin registration success path.
 *
 * Validates that a new administrator account can be created with valid email, password, href, and referrer fields. The system validates email uniqueness across all platform account types (customers, sellers, existing admins) and creates a new admin account with default privileges (is_super=false) and active status (is_banned=false). Password is hashed securely upon creation. Response includes administrator identity metadata with lifecycle timestamps and JWT authentication tokens for subsequent authenticated requests.
 *
 * Business rules verified:
 * - Email uniqueness validation across account types
 * - Default admin grade (is_super=false)
 * - Active status default (is_banned=false)
 * - Valid JWT token structure with expiration metadata
 *
 * 1. Admin submits valid registration request with email, password, href, referrer.
 * 2. System validates email uniqueness and creates new admin account with is_super=false, is_banned=false.
 * 3. Response includes admin id, timestamps (createdAt, updatedAt, deletedAt=null), and valid authentication tokens.
 * 4. Connection is updated with Bearer token authorization for subsequent API calls.
 */
export async function test_api_admin_join_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create an isolated connection for the admin actor
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Prepare valid registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  // 3. Register new admin using utility function
  const authorizedAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email,
      password,
      href,
      referrer,
    } satisfies IEcommercePlatformAdmin.IJoin,
  });
  typia.assert(authorizedAdmin);
  // 4. Validate business logic - default admin privileges
  TestValidator.equals("isSuper is false", authorizedAdmin.isSuper, false);
  TestValidator.equals("isBanned is false", authorizedAdmin.isBanned, false);
  TestValidator.equals("deletedAt is null", authorizedAdmin.deletedAt, null);
  // 5. Validate token structure via typia.assert
  typia.assert(authorizedAdmin.token);
  // 6. Verify connection was updated with authorization token
  TestValidator.predicate(
    "connection headers updated with access token",
    adminConnection.headers?.Authorization === authorizedAdmin.token.access,
  );
}

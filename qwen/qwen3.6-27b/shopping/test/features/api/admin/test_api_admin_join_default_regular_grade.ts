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
 * Test that newly registered administrators receive default regular grade privileges.
 *
 * Validates that when an administrator submits valid registration credentials via the join endpoint, the system creates the admin account with isSuper=false, confirming that new admins do not automatically receive elevated super administrator privileges. This ensures a critical security boundary that prevents privilege escalation during registration and requires explicit promotion workflows controlled by existing super administrators.
 *
 * Verifies the complete response structure including identity metadata (id, timestamps), status flags (isSuper=false, isBanned=false), lifecycle timestamps (createdAt, updatedAt), and the authorization token object containing access credentials for API authentication.
 *
 * 1. Administrator submits valid registration credentials with email, password, href, referrer.
 * 2. System creates admin record with default privileges isSuper=false and active status isBanned=false.
 * 3. Response validates isSuper=false confirming regular grade assignment.
 * 4. Validates response structure includes all required fields with correct types.
 */
export async function test_api_admin_join_default_regular_grade(
  connection: api.IConnection,
) {
  // 1. Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Register new admin with valid credentials
  const authorizedAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Validate complete response structure
  typia.assert(authorizedAdmin);
  // 4. Verify default regular grade privileges (isSuper=false)
  TestValidator.equals(
    "is_super is false for new admin",
    authorizedAdmin.isSuper,
    false,
  );
  // 5. Verify account is active (not banned)
  TestValidator.equals(
    "is_banned is false for new admin",
    authorizedAdmin.isBanned,
    false,
  );
  // 6. Validate authorization token structure
  typia.assert(authorizedAdmin.token);
  TestValidator.predicate(
    "has valid access token",
    authorizedAdmin.token.access !== undefined,
  );
  TestValidator.predicate(
    "has valid refresh token",
    authorizedAdmin.token.refresh !== undefined,
  );
  TestValidator.predicate(
    "access token is non-empty string",
    authorizedAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    authorizedAdmin.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has token expiration timestamp",
    authorizedAdmin.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "has refreshable until timestamp",
    authorizedAdmin.token.refreshable_until.length > 0,
  );
  // 7. Validate admin identity fields
  TestValidator.predicate("has admin id", authorizedAdmin.id.length > 0);
  TestValidator.predicate(
    "has created_at timestamp",
    authorizedAdmin.createdAt.length > 0,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    authorizedAdmin.updatedAt.length > 0,
  );
  // 8. Validate deleted_at is null for new active account
  const deletedAt: (string & tags.Format<"date-time">) | null =
    authorizedAdmin.deletedAt;
  TestValidator.equals("deleted_at is null for active admin", deletedAt, null);
}

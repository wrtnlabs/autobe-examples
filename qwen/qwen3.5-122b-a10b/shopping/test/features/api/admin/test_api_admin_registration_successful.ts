import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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
 * Test successful administrator registration with valid credentials.
 *
 * This test verifies the primary success path for admin registration:
 * 1. Creates a new admin account with unique email and valid password
 * 2. Validates response contains all required fields
 * 3. Confirms admin_grade defaults to 'regular'
 * 4. Confirms account_status is 'active'
 * 5. Verifies JWT token structure with proper expiration timestamps
 * 6. Ensures deleted_at is null for new active accounts
 */
export async function test_api_admin_registration_successful(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for admin registration
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate valid registration credentials with all required typia tags
  const body = typia.random<IEcommerceMallAdmin.IJoin>();
  // Register new admin account using utility function
  const admin = await authorize_admin_join(adminConnection, { body });
  typia.assert(admin);
  // Validate admin profile fields
  TestValidator.equals("admin_grade is regular", admin.admin_grade, "regular");
  TestValidator.equals(
    "account_status is active",
    admin.account_status,
    "active",
  );
  TestValidator.predicate(
    "has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      admin.id,
    ),
  );
  TestValidator.equals("email matches input", admin.email, body.email);
  TestValidator.predicate(
    "deleted_at is null for active account",
    admin.deleted_at === null,
  );
  // Validate token structure
  TestValidator.predicate("has access token", admin.token.access.length > 0);
  TestValidator.predicate("has refresh token", admin.token.refresh.length > 0);
  TestValidator.predicate(
    "has valid expired_at format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      admin.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "has valid refreshable_until format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      admin.token.refreshable_until,
    ),
  );
}
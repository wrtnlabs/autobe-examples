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
 * Test retrieving the authenticated administrator's own profile successfully.
 *
 * Validates the complete admin profile retrieval flow including admin registration,
 * JWT token authentication, and profile data validation. Ensures that the response
 * contains all required fields (id, email, name, timestamps) and critically
 * excludes sensitive data like password_hash.
 *
 * This test follows the critical security requirement that password_hash must never
 * be exposed in any API response. The test verifies the GET /admin/admins/me endpoint
 * returns the authenticated admin's own profile data.
 *
 * 1. Register new admin account via join endpoint to obtain JWT tokens.
 * 2. Retrieve own profile using the authenticated connection with Bearer token.
 * 3. Validate all required fields are present with correct types and formats.
 * 4. CRITICAL: Ensure password_hash is never exposed in the response body.
 * 5. Validate timestamp formats are valid ISO date-time strings.
 */
export async function test_api_admin_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin via join endpoint to get JWT tokens
  await authorize_admin_join(adminConnection, {});
  // Retrieve authenticated admin's own profile
  const profile: IEcommerceMallAdmin =
    await api.functional.ecommerceMall.admin.admins.me.at(adminConnection);
  // Validate response with typia.assert() for complete type validation
  typia.assert(profile);
  // Validate required fields exist and have correct types
  TestValidator.predicate(
    "profile has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      profile.id,
    ),
  );
  TestValidator.predicate(
    "profile has valid email",
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email),
  );
  TestValidator.predicate(
    "profile has non-empty name",
    profile.name.length > 0,
  );
  TestValidator.predicate(
    "deleted_at is null for active admin",
    profile.deleted_at === null,
  );
  // CRITICAL: Validate password_hash is NEVER present in response
  // This is a security requirement - password hash must never be exposed
  TestValidator.equals(
    "password_hash must not exist in profile response",
    (profile as Record<string, unknown>)["password_hash"],
    undefined,
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test successful admin registration with valid credentials.
 *
 * This test verifies the primary success path for admin registration:
 * 1. Creates a new admin account with valid email, display_name, and password
 * 2. Validates that the response contains valid JWT access and refresh tokens
 * 3. Validates token expiration timestamps are properly set
 * 4. Validates the returned admin profile matches the registration input
 */
export async function test_api_admin_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique test data for admin registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name();
  // Prepare the join request body
  const body = {
    email,
    password,
    display_name: displayName,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IErpHrmAdmin.IJoin;
  // Execute the admin join (registration) endpoint
  const authorized = await api.functional.erpHrm.auth.admin.join(connection, {
    body,
  });
  // Validate the complete response structure with typia.assert()
  typia.assert(authorized);
  // Validate business logic: email matches input
  TestValidator.equals(
    "email matches registration input",
    authorized.email,
    email,
  );
  // Validate business logic: display_name matches input
  TestValidator.equals(
    "display_name matches registration input",
    authorized.display_name,
    displayName,
  );
  // Validate business logic: UUID format for admin ID
  TestValidator.predicate(
    "admin ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );
  // Validate business logic: JWT access token exists and is non-empty
  TestValidator.predicate(
    "access token exists",
    authorized.token.access.length > 0,
  );
  // Validate business logic: JWT refresh token exists and is non-empty
  TestValidator.predicate(
    "refresh token exists",
    authorized.token.refresh.length > 0,
  );
  // Validate business logic: access token expiration is in the future
  const accessExpiration = new Date(authorized.token.expired_at);
  TestValidator.predicate(
    "access token expiration is in the future",
    accessExpiration.getTime() > Date.now(),
  );
  // Validate business logic: refreshable_until is in the future
  const refreshExpiration = new Date(authorized.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshExpiration.getTime() > Date.now(),
  );
  // Validate business logic: refreshable_until is after access token expiration
  TestValidator.predicate(
    "refreshable_until is after access token expiration",
    refreshExpiration.getTime() > accessExpiration.getTime(),
  );
}

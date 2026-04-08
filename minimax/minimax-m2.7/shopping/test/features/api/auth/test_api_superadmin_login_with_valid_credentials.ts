import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
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
 * Test super administrator login with valid credentials.
 *
 * Validates the complete authentication flow for platform super administrators:
 * registration via join endpoint, followed by successful login with the created
 * credentials. Verifies that the authorization response contains valid JWT tokens,
 * account metadata, and that the session was properly established.
 *
 * The test ensures:
 * - JWT access token is returned (short-lived for security)
 * - JWT refresh token is returned (long-lived for session extension)
 * - Token expiration timestamps are valid ISO 8601 dates
 * - Super admin account details (id, email) are returned correctly
 * - Account is active (deleted_at is null)
 * - Session metadata is properly tracked for security audit
 *
 * 1. Register new super admin via join endpoint with valid credentials.
 * 2. Extract and store the credentials used for registration.
 * 3. Login with the registered email and correct password.
 * 4. Validate authorization response contains required fields.
 * 5. Validate token properties and account status.
 */
export async function test_api_superadmin_login_with_valid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new super admin with valid credentials
  const email = typia.random<string & tags.Format<"email"> & tags.MaxLength<255>>();
  const password = `${RandomGenerator.alphaNumeric(8)}A${RandomGenerator.name(1).toLowerCase()}!`;
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const superAdminConnection: api.IConnection = { host: connection.host };
  const joined: IEcommerceMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdminConnection, {
      body: {
        email,
        password,
        href,
        referrer,
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    });
  typia.assert(joined);
  // 2. Login with the registered credentials
  const loginBody: IEcommerceMallSuperAdmin.ILogin = {
    email,
    password,
    href,
    referrer,
  } satisfies IEcommerceMallSuperAdmin.ILogin;
  const loginConnection: api.IConnection = { host: connection.host };
  const authorized: IEcommerceMallSuperAdmin.IAuthorized =
    await authorize_super_admin_login(loginConnection, {
      body: loginBody,
    });
  typia.assert(authorized);
  // 3. Validate response contains correct super admin details
  TestValidator.equals(
    "email matches registered email",
    authorized.email,
    email,
  );
  TestValidator.equals("id is a valid UUID", authorized.id, joined.id);
  TestValidator.equals("account is active", authorized.deleted_at, null);
  // 4. Validate token structure and properties
  TestValidator.predicate(
    "has valid access token",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "has valid refresh token",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has valid access expiration",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(authorized.token.expired_at),
  );
  TestValidator.predicate(
    "has valid refreshable until",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      authorized.token.refreshable_until,
    ),
  );
}
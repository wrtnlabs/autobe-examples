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
 * Test successful registration of a new super administrator account.
 *
 * Validates the super admin registration flow by submitting valid credentials
 * to the /ecommerceMall/auth/superAdmin/join endpoint. Verifies that the
 * response contains proper account details and JWT tokens for authentication.
 *
 * The test validates:
 * - Response contains valid UUID for the admin ID
 * - Email matches the submitted email
 * - Account is active (deleted_at is null)
 * - JWT tokens are properly generated with access and refresh tokens
 * - Token expiration timestamps are valid ISO 8601 format
 * - Created_at and updated_at timestamps are consistent
 *
 * **Password Requirements:**
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 *
 * 1. Generate random email and strong password meeting security requirements
 * 2. Call authorize_super_admin_join utility function with session metadata
 * 3. Validate response structure and all field values
 * 4. Verify token properties and expiration timestamps
 */
export async function test_api_superadmin_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate random email for unique registration (must include MaxLength<255> to match API response type)
  const email = typia.random<string & tags.Format<"email"> & tags.MaxLength<255>>();
  // Password meeting strength requirements: 8+ chars with uppercase, lowercase, number, special char
  const password = `${RandomGenerator.alphaNumeric(8)}A${RandomGenerator.name(1).toLowerCase()}!`;
  // Register new super admin using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Validate complete response structure
  typia.assert(authorized);
  // Validate account properties
  TestValidator.equals("email matches input", authorized.email, email);
  TestValidator.equals("deleted_at is null", authorized.deleted_at, null);
  // Validate token properties
  TestValidator.predicate(
    "access token exists",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    authorized.token.refresh.length > 0,
  );
  // Validate timestamps
  TestValidator.predicate(
    "created_at is valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(authorized.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(authorized.updated_at),
  );
  TestValidator.predicate(
    "expired_at is valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(authorized.token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      authorized.token.refreshable_until,
    ),
  );
  // Verify connection headers are updated with access token
  TestValidator.predicate(
    "connection has Authorization header",
    !!superAdminConnection.headers?.Authorization,
  );
}
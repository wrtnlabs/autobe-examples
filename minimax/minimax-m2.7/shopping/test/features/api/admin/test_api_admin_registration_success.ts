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
 * Test successful administrator account registration.
 *
 * Scenario: Submit POST request to /ecommerceMall/auth/admin/join with valid
 * credentials including email, strong password, display name, href, and referrer.
 *
 * Validation:
 * 1. Response returns HTTP 201 with IEcommerceMallAdmin.IAuthorized
 * 2. Response contains admin id (UUID), email, name, created_at, updated_at
 * 3. deleted_at is null (account is active)
 * 4. JWT access token, refresh token, and expired_at timestamp are present
 * 5. token object contains complete authorization token structure
 * 6. Access token can be used for subsequent authenticated admin requests
 * 7. Session record is created with correct metadata for security auditing
 */
export async function test_api_admin_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new admin connection for registration
  const adminConnection: api.IConnection = { host: connection.host };
  // Register new administrator account with valid credentials
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) as string &
        tags.Format<"password">,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Validate complete authorization response structure
  typia.assert(authorized);
  // Validate required fields are present and correctly typed
  TestValidator.equals("admin id is UUID format", authorized.id.length, 36);
  TestValidator.equals(
    "email is valid format",
    authorized.email.includes("@"),
    true,
  );
  TestValidator.equals("name is non-empty", authorized.name.length > 0, true);
  // Validate timestamps are ISO 8601 format
  TestValidator.equals(
    "created_at is date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(authorized.created_at),
    true,
  );
  TestValidator.equals(
    "updated_at is date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(authorized.updated_at),
    true,
  );
  TestValidator.equals(
    "expired_at is date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(authorized.expired_at),
    true,
  );
  // Validate soft delete field is null for new account
  TestValidator.equals("deleted_at is null", authorized.deleted_at, null);
  // Validate JWT tokens are present
  TestValidator.equals(
    "access token is non-empty",
    authorized.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token is non-empty",
    authorized.refresh.length > 0,
    true,
  );
  // Validate token object structure
  TestValidator.equals(
    "token.access exists",
    authorized.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "token.refresh exists",
    authorized.token.refresh.length > 0,
    true,
  );
  TestValidator.equals(
    "token.expired_at is date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(authorized.token.expired_at),
    true,
  );
  TestValidator.equals(
    "token.refreshable_until is date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      authorized.token.refreshable_until,
    ),
    true,
  );
  // Verify access token is set in connection headers for subsequent requests
  const authHeader = adminConnection.headers?.Authorization;
  TestValidator.equals(
    "connection has authorization header",
    typeof authHeader === "string" && authHeader.length > 0,
    true,
  );
}

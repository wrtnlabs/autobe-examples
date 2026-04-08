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
 * Test that the token response structure contains all required JWT fields with valid formats.
 *
 * Validates the complete response structure from admin registration endpoint including:
 * - JWT token format validation (access token with header.payload.signature structure)
 * - Token expiration timing logic (access expires before refresh window ends)
 * - Admin profile field presence and format compliance
 * - Timestamp validity for created_at, updated_at, and null deleted_at
 * - Email address exact match with submitted registration data
 *
 * 1. Register a new administrator with valid credentials.
 * 2. Validate token object structure: access token JWT format, refresh token presence.
 * 3. Verify expiration times: expired_at is in future, refreshable_until > expired_at.
 * 4. Confirm admin profile fields: id (UUID), email (email format), name (string).
 * 5. Verify deleted_at is null for active account.
 * 6. Validate created_at and updated_at are valid ISO 8601 timestamps.
 * 7. Confirm email matches the submitted registration email exactly.
 */
export async function test_api_admin_registration_token_response_structure(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new administrator with valid credentials
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallAdmin.IJoin;
  // Call admin join endpoint
  const authorized = await api.functional.ecommerceMall.auth.admin.join(
    connection,
    {
      body: joinInput,
    },
  );
  // Validate complete response structure
  typia.assert(authorized);
  // 2. Validate JWT token format (header.payload.signature)
  const jwtParts = authorized.token.access.split(".");
  TestValidator.equals("access token has 3 JWT parts", jwtParts.length, 3);
  TestValidator.predicate(
    "refresh token is non-empty",
    authorized.token.refresh.length > 0,
  );
  // 3. Validate token expiration timestamps
  const expiredAt = new Date(authorized.token.expired_at);
  const refreshableUntil = new Date(authorized.token.refreshable_until);
  TestValidator.predicate(
    "expired_at is valid ISO 8601 datetime",
    !isNaN(expiredAt.getTime()),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO 8601 datetime",
    !isNaN(refreshableUntil.getTime()),
  );
  TestValidator.predicate(
    "expired_at is in the future",
    expiredAt.getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil.getTime() > expiredAt.getTime(),
  );
  // 4. Validate admin profile fields
  TestValidator.predicate("id is non-empty string", authorized.id.length > 0);
  TestValidator.equals(
    "email matches input",
    authorized.email,
    joinInput.email,
  );
  TestValidator.equals("name matches input", authorized.name, joinInput.name);
  // 5. Verify deleted_at is null for newly created active account
  TestValidator.equals("deleted_at is null", authorized.deleted_at, null);
  // 6. Validate created_at and updated_at timestamps
  const createdAt = new Date(authorized.created_at);
  const updatedAt = new Date(authorized.updated_at);
  TestValidator.predicate(
    "created_at is valid ISO 8601 datetime",
    !isNaN(createdAt.getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601 datetime",
    !isNaN(updatedAt.getTime()),
  );
  TestValidator.predicate(
    "created_at is not in the future",
    createdAt.getTime() <= Date.now(),
  );
  TestValidator.predicate(
    "updated_at is not in the future",
    updatedAt.getTime() <= Date.now(),
  );
  TestValidator.predicate(
    "updated_at >= created_at",
    updatedAt.getTime() >= createdAt.getTime(),
  );
  // 7. Verify email matches exactly (case-sensitive)
  TestValidator.equals("email exact match", authorized.email, joinInput.email);
}
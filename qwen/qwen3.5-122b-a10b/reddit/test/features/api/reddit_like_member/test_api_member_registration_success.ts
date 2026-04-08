import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful member account registration with valid credentials.
 *
 * Validates the complete member registration flow including credential validation, account creation, and automatic authentication. Ensures that the system properly creates a new member account with all required fields and returns authorization tokens for immediate access.
 *
 * The test verifies that registration and authentication occur in a single operation, demonstrating the auto-login behavior where newly registered members can immediately access protected endpoints without a separate login step.
 *
 * 1. Generate valid registration credentials with unique email, username, and secure password.
 * 2. Call registration endpoint with valid credentials.
 * 3. Validate response contains all required member profile fields.
 * 4. Verify JWT tokens are properly generated and formatted.
 * 5. Confirm member ID is auto-generated UUID format.
 * 6. Validate timestamps are properly set (created_at, updated_at).
 * 7. Verify deleted_at is NULL for active account.
 * 8. Test that returned authorization token enables immediate API access.
 */
export async function test_api_member_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate valid registration credentials
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  // 2. Validate response structure
  typia.assert(authorized);
  // 3. Verify member profile fields
  TestValidator.predicate(
    "member ID is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );
  TestValidator.predicate(
    "email is valid format",
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authorized.email),
  );
  TestValidator.predicate(
    "username has valid length",
    authorized.username.length >= 3 && authorized.username.length <= 30,
  );
  TestValidator.predicate(
    "display_name exists",
    authorized.display_name.length > 0,
  );
  TestValidator.predicate(
    "karma_score is non-negative integer",
    authorized.karma_score >= 0 && Number.isInteger(authorized.karma_score),
  );
  // 4. Verify timestamps
  TestValidator.predicate(
    "created_at is valid ISO datetime",
    !isNaN(Date.parse(authorized.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO datetime",
    !isNaN(Date.parse(authorized.updated_at)),
  );
  TestValidator.predicate(
    "created_at and updated_at are equal on registration",
    authorized.created_at === authorized.updated_at,
  );
  // 5. Verify deleted_at is NULL for active account
  TestValidator.equals(
    "deleted_at is NULL for active account",
    authorized.deleted_at,
    null,
  );
  // 6. Verify authorization tokens
  TestValidator.predicate(
    "access token exists",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid ISO datetime",
    !isNaN(Date.parse(authorized.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO datetime",
    !isNaN(Date.parse(authorized.token.refreshable_until)),
  );
  TestValidator.predicate(
    "expired_at is before refreshable_until",
    new Date(authorized.token.expired_at) <
      new Date(authorized.token.refreshable_until),
  );
  // 7. Verify connection was mutated with authorization token
  TestValidator.predicate(
    "connection has authorization header",
    memberConnection.headers?.Authorization !== undefined,
  );
  TestValidator.equals(
    "authorization header matches access token",
    memberConnection.headers?.Authorization,
    authorized.token.access,
  );
}

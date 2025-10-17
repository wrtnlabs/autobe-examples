import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test the successful workflow of registering a new member account for the
 * Reddit-like community platform.
 *
 * Steps:
 *
 * 1. Submit a valid registration request with a unique email and a password
 *    (backend will hash it per business rules).
 * 2. Validate that the API response matches ICommunityPlatformMember.IAuthorized,
 *    with all required properties present.
 * 3. Confirm that 'email_verified' is false (user should be unverified after
 *    join).
 * 4. Ensure the token property exists and all its sub-fields are present.
 */
export async function test_api_member_registration_basic_flow(
  connection: api.IConnection,
) {
  // 1. Prepare registration request
  const email = typia.random<string & tags.Format<"email">>();
  // Password: raw string (business restriction: min/max enforced in service, not API)
  const password = RandomGenerator.alphaNumeric(12);
  const requestBody = {
    email,
    password,
  } satisfies ICommunityPlatformMember.ICreate;

  // 2. Submit registration request
  const authorized: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: requestBody });
  // Validate type
  typia.assert(authorized);
  // 3. Authorization identity: correct email and 'email_verified' is false
  TestValidator.equals(
    "email should match registration input",
    authorized.email,
    email,
  );
  TestValidator.equals(
    "email_verified should be false after registration",
    authorized.email_verified,
    false,
  );
  // 4. Token field must exist and be valid
  typia.assert(authorized.token);
  // Token fields must be populated (loose business validation via presence, not value correctness)
  TestValidator.predicate(
    "access token string is non-empty",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token string is non-empty",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid ISO string",
    typeof authorized.token.expired_at === "string" &&
      authorized.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO string",
    typeof authorized.token.refreshable_until === "string" &&
      authorized.token.refreshable_until.length > 0,
  );
}

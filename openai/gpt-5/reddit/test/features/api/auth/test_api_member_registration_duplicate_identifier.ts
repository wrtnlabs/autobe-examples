import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";

/**
 * Validate duplicate member registration rejection on POST
 * /auth/memberUser/join.
 *
 * Business objective
 *
 * - Ensure uniqueness constraints on email and username are enforced.
 * - First registration succeeds and returns an authorized payload with token.
 * - Second registration using identical identifiers must fail (conflict-like
 *   error).
 *
 * Test steps
 *
 * 1. Build a valid registration body (email, username, compliant password, consent
 *    timestamps).
 * 2. Call join once; expect success and validate response type via typia.assert.
 * 3. Call join again with the same body; assert an error occurs via
 *    TestValidator.error.
 *
 * Important constraints
 *
 * - Do not assert specific HTTP status codes; only verify that an error occurs
 *   for duplicates.
 * - Never perform type-error tests; bodies must strictly satisfy
 *   ICommunityPlatformMemberUser.ICreate.
 * - Do not touch connection.headers; SDK manages authentication tokens.
 */
export async function test_api_member_registration_duplicate_identifier(
  connection: api.IConnection,
) {
  // Prepare unique identifiers and compliant credentials
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.alphabets(8); // 3–20 allowed chars; letters-only subset is valid
  const password = `${RandomGenerator.alphaNumeric(10)}A1`; // ensure >= 8 chars with at least one letter and one digit

  const nowIso = new Date().toISOString();

  // Request body (immutable) - must strictly satisfy ICreate
  const createBody = {
    email,
    username,
    password,
    terms_accepted_at: nowIso,
    privacy_accepted_at: nowIso,
    marketing_opt_in: true,
  } satisfies ICommunityPlatformMemberUser.ICreate;

  // 1) Successful registration
  const authorized = await api.functional.auth.memberUser.join(connection, {
    body: createBody,
  });
  typia.assert(authorized);

  // Business-level sanity check (not type validation): token should not be empty
  TestValidator.predicate(
    "first join should return non-empty access token",
    authorized.token.access.length > 0,
  );

  // 2) Duplicate registration must be rejected
  await TestValidator.error(
    "duplicate member registration should be rejected",
    async () => {
      await api.functional.auth.memberUser.join(connection, {
        body: createBody,
      });
    },
  );
}

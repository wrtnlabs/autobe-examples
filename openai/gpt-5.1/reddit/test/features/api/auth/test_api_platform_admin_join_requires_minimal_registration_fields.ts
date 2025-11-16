import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate minimal registration fields and uniqueness enforcement for the
 * platform admin join endpoint.
 *
 * Business goals reinterpreted within type-safe constraints:
 *
 * - Ensure that a structurally valid payload containing all required fields of
 *   ICommunityPlatformPlatformadmin.IJoin can successfully create a new
 *   platform administrator and start an authenticated session.
 * - Demonstrate that optional fields (ip) are not required for successful
 *   registration when required fields are present.
 * - Confirm that backend business rules enforce uniqueness on critical identity
 *   fields such as username and email by expecting failures on duplicate join
 *   attempts.
 *
 * Test flow:
 *
 * 1. Create a fully-populated valid join body (including ip) and call POST
 *    /auth/platformAdmin/join.
 *
 *    - Assert response type with typia.assert.
 *    - Use TestValidator to verify that username, email, and displayName echo the
 *         request.
 *    - Verify token fields are non-empty strings.
 * 2. Attempt to join again with the same username and email (changing only
 *    non-unique fields like displayName).
 *
 *    - Expect an error via TestValidator.error, reflecting uniqueness/validation
 *         enforcement.
 * 3. Attempt to join with the same username but different email (and vice versa)
 *    to further validate uniqueness rules.
 *
 *    - Expect errors, since DTO docs state both username and email must be unique.
 * 4. Build a second, valid body that omits ip while keeping all other required
 *    fields and perform another join using fresh unique values.
 *
 *    - Expect success, proving that only minimal required fields are necessary for
 *         registration.
 */
export async function test_api_platform_admin_join_requires_minimal_registration_fields(
  connection: api.IConnection,
) {
  // 1. Happy path: fully populated join body
  const baseJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "203.0.113.10", // example TEST-NET-3 IP
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const firstAdmin = await api.functional.auth.platformAdmin.join(connection, {
    body: baseJoinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(firstAdmin);

  // Validate that key identity fields echo the request
  TestValidator.equals(
    "platform admin username should match join payload",
    firstAdmin.username,
    baseJoinBody.username,
  );
  TestValidator.equals(
    "platform admin email should match join payload",
    firstAdmin.email,
    baseJoinBody.email,
  );
  TestValidator.equals(
    "platform admin displayName should match join payload",
    firstAdmin.displayName,
    baseJoinBody.displayName,
  );

  // Validate token existence in a business-meaningful way
  TestValidator.predicate(
    "access token should be a non-empty string",
    firstAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be a non-empty string",
    firstAdmin.token.refresh.length > 0,
  );

  // 2. Duplicate join with same username and email should fail
  const duplicateBodySameUsernameAndEmail = {
    ...baseJoinBody,
    displayName: `${baseJoinBody.displayName} (duplicate)`,
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  await TestValidator.error(
    "joining with duplicate username and email should fail",
    async () => {
      await api.functional.auth.platformAdmin.join(connection, {
        body: duplicateBodySameUsernameAndEmail,
      });
    },
  );

  // 3a. Duplicate username with different email
  const duplicateUsernameBody = {
    ...baseJoinBody,
    email: typia.random<string & tags.Format<"email">>(),
    displayName: `${baseJoinBody.displayName} (duplicate-username)`,
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  await TestValidator.error(
    "joining with duplicate username but different email should fail",
    async () => {
      await api.functional.auth.platformAdmin.join(connection, {
        body: duplicateUsernameBody,
      });
    },
  );

  // 3b. Duplicate email with different username
  const duplicateEmailBody = {
    ...baseJoinBody,
    username: RandomGenerator.alphabets(12),
    displayName: `${baseJoinBody.displayName} (duplicate-email)`,
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  await TestValidator.error(
    "joining with duplicate email but different username should fail",
    async () => {
      await api.functional.auth.platformAdmin.join(connection, {
        body: duplicateEmailBody,
      });
    },
  );

  // 4. Minimal required fields: omit optional ip
  const minimalJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const minimalAdmin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: minimalJoinBody,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(minimalAdmin);

  TestValidator.equals(
    "minimal join username should match payload",
    minimalAdmin.username,
    minimalJoinBody.username,
  );
  TestValidator.equals(
    "minimal join email should match payload",
    minimalAdmin.email,
    minimalJoinBody.email,
  );
}

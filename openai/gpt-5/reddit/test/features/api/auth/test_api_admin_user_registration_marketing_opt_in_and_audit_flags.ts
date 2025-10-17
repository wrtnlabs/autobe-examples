import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";

/**
 * Verify admin registration handles marketing opt-in preference and returns
 * authorized tokens.
 *
 * Scenario:
 *
 * 1. Register Admin A with marketing_opt_in=true and provide marketing_opt_in_at.
 *
 *    - Assert an authorized session payload is returned (id, token bundle).
 *    - If role is present, ensure it equals "adminUser" (role is optional).
 * 2. Register Admin B with marketing_opt_in=false (omit marketing_opt_in_at).
 *
 *    - Assert an authorized session payload is returned.
 * 3. Compare both registrations for independence.
 *
 *    - User ids differ.
 *    - Access/refresh tokens differ and are non-empty.
 *
 * Notes:
 *
 * - Request bodies strictly satisfy ICommunityPlatformAdminUserJoin.ICreate.
 * - Do not assert server-internal audit fields that are not in the response DTO.
 * - No manual header handling; SDK manages tokens.
 */
export async function test_api_admin_user_registration_marketing_opt_in_and_audit_flags(
  connection: api.IConnection,
) {
  // Helper: generate a username compliant with ^[A-Za-z0-9_]{3,20}$ and length 6-12
  const makeUsername = (): string => {
    // lowercase alphabets are sufficient per pattern
    const len = 6 + Math.floor(Math.random() * 7); // 6..12
    return RandomGenerator.alphabets(len);
  };

  // Common timestamps for consents
  const nowIso: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  // 1) Admin A: marketing opt-in true with timestamp
  const adminABody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: makeUsername(),
    password: `Pass${RandomGenerator.alphaNumeric(10)}`,
    terms_accepted_at: nowIso,
    privacy_accepted_at: nowIso,
    marketing_opt_in: true,
    marketing_opt_in_at: new Date().toISOString(),
  } satisfies ICommunityPlatformAdminUserJoin.ICreate;

  const adminA = await api.functional.auth.adminUser.join(connection, {
    body: adminABody,
  });
  typia.assert(adminA);

  // Business-level checks (not type checks): role consistency when present
  TestValidator.predicate(
    "role is either undefined or 'adminUser'",
    adminA.role === undefined || adminA.role === "adminUser",
  );
  TestValidator.predicate(
    "access token for admin A is non-empty",
    adminA.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token for admin A is non-empty",
    adminA.token.refresh.length > 0,
  );

  // 2) Admin B: marketing opt-in false, omit marketing_opt_in_at
  const adminBBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: makeUsername(),
    password: `Pass${RandomGenerator.alphaNumeric(10)}`,
    terms_accepted_at: nowIso,
    privacy_accepted_at: nowIso,
    marketing_opt_in: false,
  } satisfies ICommunityPlatformAdminUserJoin.ICreate;

  const adminB = await api.functional.auth.adminUser.join(connection, {
    body: adminBBody,
  });
  typia.assert(adminB);

  TestValidator.predicate(
    "access token for admin B is non-empty",
    adminB.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token for admin B is non-empty",
    adminB.token.refresh.length > 0,
  );

  // 3) Independence & session checks
  TestValidator.notEquals(
    "admin A and B must have different user ids",
    adminA.id,
    adminB.id,
  );
  TestValidator.notEquals(
    "admin A and B must have different access tokens",
    adminA.token.access,
    adminB.token.access,
  );
  TestValidator.notEquals(
    "admin A and B must have different refresh tokens",
    adminA.token.refresh,
    adminB.token.refresh,
  );
}

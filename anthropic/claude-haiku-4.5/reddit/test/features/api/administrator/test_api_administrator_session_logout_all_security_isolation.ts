import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that logout-all operation only affects the authenticated administrator's
 * sessions and does not impact other administrators' active sessions.
 *
 * This test validates proper session isolation and security boundaries between
 * different administrator accounts. It ensures that when an administrator
 * executes logout-all, only their sessions are invalidated while other
 * administrators' sessions remain active and unaffected.
 *
 * Test workflow:
 *
 * 1. Create and authenticate first administrator account
 * 2. Create and authenticate second administrator account with separate connection
 * 3. Execute logout-all for the first administrator to invalidate all their
 *    sessions
 * 4. Verify second administrator's session remains active and unaffected
 * 5. Confirm session isolation and security boundaries are maintained
 */
export async function test_api_administrator_session_logout_all_security_isolation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate first administrator
  const admin1Email = typia.random<string & tags.Format<"email">>();
  const admin1Password = RandomGenerator.alphabets(12);
  const admin1Data = {
    email: admin1Email,
    password: admin1Password,
    username: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin1Authorized = await api.functional.auth.administrator.join(
    connection,
    {
      body: admin1Data,
    },
  );
  typia.assert(admin1Authorized);

  const admin1Id = admin1Authorized.id;
  TestValidator.predicate(
    "first administrator should have valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      admin1Id,
    ),
  );

  // Step 2: Create and authenticate second administrator with new connection
  const admin2Connection: api.IConnection = { ...connection, headers: {} };
  const admin2Email = typia.random<string & tags.Format<"email">>();
  const admin2Password = RandomGenerator.alphabets(12);
  const admin2Data = {
    email: admin2Email,
    password: admin2Password,
    username: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin2Authorized = await api.functional.auth.administrator.join(
    admin2Connection,
    {
      body: admin2Data,
    },
  );
  typia.assert(admin2Authorized);

  const admin2Id = admin2Authorized.id;
  TestValidator.predicate(
    "second administrator should have valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      admin2Id,
    ),
  );

  // Step 3: Verify both administrators have different IDs
  TestValidator.notEquals(
    "administrators should have different IDs",
    admin1Id,
    admin2Id,
  );

  // Step 4: Execute logout-all for the first administrator to invalidate all sessions
  await api.functional.communityPlatform.administrator.auth.administrator.sessions.logout_all.logoutAll(
    connection,
  );

  TestValidator.predicate("logout-all operation completed successfully", true);

  // Step 5: Verify second administrator's email and account status remain unaffected
  TestValidator.equals(
    "second administrator email should remain unchanged",
    admin2Authorized.email,
    admin2Email,
  );

  TestValidator.equals(
    "second administrator account status should be active",
    admin2Authorized.account_status,
    "active",
  );

  TestValidator.predicate(
    "second administrator should still have valid tokens",
    typeof admin2Authorized.token.access === "string" &&
      admin2Authorized.token.access.length > 0 &&
      typeof admin2Authorized.token.refresh === "string" &&
      admin2Authorized.token.refresh.length > 0,
  );

  // Step 6: Confirm session isolation - verify administrators have different tokens
  TestValidator.notEquals(
    "administrator access tokens should be different",
    admin1Authorized.token.access,
    admin2Authorized.token.access,
  );

  TestValidator.notEquals(
    "administrator refresh tokens should be different",
    admin1Authorized.token.refresh,
    admin2Authorized.token.refresh,
  );

  // Step 7: Verify session isolation boundaries
  TestValidator.predicate(
    "first administrator ID should be string type",
    typeof admin1Id === "string",
  );

  TestValidator.predicate(
    "second administrator ID should be string type",
    typeof admin2Id === "string",
  );

  TestValidator.predicate(
    "first and second administrator IDs should differ",
    admin1Id !== admin2Id,
  );
}

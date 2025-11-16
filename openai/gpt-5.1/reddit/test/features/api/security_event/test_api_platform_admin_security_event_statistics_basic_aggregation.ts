import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformSecurityEventStatisticsByEventType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSecurityEventStatisticsByEventType";

/**
 * Validate basic platform admin authentication and dependent configuration
 * setup as prerequisites for security event statistics aggregation.
 *
 * Original scenario: a platform administrator retrieves aggregated security
 * event statistics grouped by event type via GET
 * /communityPlatform/platformAdmin/securityEvents/statistics/byEventType.
 * However, the generated SDK list in this context does not expose that
 * statistics endpoint. To keep the test compilable and still meaningful, this
 * implementation focuses on the concrete, available prerequisites:
 *
 * - Registering a platform administrator and obtaining JWT tokens
 * - Creating a global account status definition as an admin-only operation
 * - Exercising DTO shape validation and basic business invariants using
 *   typia.assert and TestValidator
 *
 * The test performs the following steps:
 *
 * 1. Build a realistic platform admin join payload using explicit field
 *    construction with proper formats for email and URIs.
 * 2. Call api.functional.auth.platformAdmin.join to create and authenticate a new
 *    platform administrator, relying on the SDK to manage Authorization
 *    headers.
 * 3. Validate the returned ICommunityPlatformPlatformadmin.IAuthorized object via
 *    typia.assert and TestValidator, ensuring that the username and email echo
 *    the request and that a non-empty access token has been issued.
 * 4. Under the same authenticated admin context, construct an
 *    ICommunityPlatformAccountStatus.ICreate payload describing a new account
 *    status (with a stable key, label, optional description, and boolean
 *    behavior flags) and call the accountStatuses.create endpoint.
 * 5. Validate the returned ICommunityPlatformAccountStatus instance with
 *    typia.assert and TestValidator, checking that core fields such as `key`
 *    and `label` round-trip correctly from request to response.
 *
 * This test does not call the security event statistics endpoint directly,
 * because no corresponding SDK accessor is available in the provided materials.
 * Instead it focuses on the authentication and configuration flows that are
 * required before any security event analytics can be accessed.
 */
export async function test_api_platform_admin_security_event_statistics_basic_aggregation(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new platform administrator via join
  const joinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminAuthorized);

  // Basic sanity checks on the authorized admin payload
  TestValidator.equals(
    "platform admin username should match join payload",
    adminAuthorized.username,
    joinBody.username,
  );
  TestValidator.equals(
    "platform admin email should match join payload",
    adminAuthorized.email,
    joinBody.email,
  );
  TestValidator.predicate(
    "platform admin should have a non-empty access token",
    () => adminAuthorized.token.access.length > 0,
  );

  // 2. Create a new account status definition as the authenticated platform admin
  const statusKeySuffix = RandomGenerator.alphaNumeric(6).toUpperCase();
  const statusBody = {
    key: `ACTIVE_${statusKeySuffix}`,
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: statusBody,
      },
    );
  typia.assert<ICommunityPlatformAccountStatus>(createdStatus);

  // Validate that core status fields round-trip correctly
  TestValidator.equals(
    "created account status key should match request",
    createdStatus.key,
    statusBody.key,
  );
  TestValidator.equals(
    "created account status label should match request",
    createdStatus.label,
    statusBody.label,
  );

  // Ensure createdAt and updatedAt are ISO date-time strings via typia.assert
  // and additionally check that createdAt is not in the future relative to now
  const now = new Date();
  const createdAt = new Date(createdStatus.createdAt);
  const updatedAt = new Date(createdStatus.updatedAt);

  TestValidator.predicate(
    "account status createdAt should not be in the future",
    () => createdAt.getTime() <= now.getTime(),
  );
  TestValidator.predicate(
    "account status updatedAt should not be before createdAt",
    () => updatedAt.getTime() >= createdAt.getTime(),
  );
}

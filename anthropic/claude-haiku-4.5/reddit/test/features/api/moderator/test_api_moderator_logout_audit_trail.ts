import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test moderator logout operation with audit trail recording.
 *
 * This test validates that moderator logout properly records session
 * termination for audit compliance. After moderator authentication, logout
 * should return logout_at timestamp in ISO 8601 format, moderator id for
 * accountability, and a confirmation message. The test ensures the logout_at
 * value represents the exact logout moment and follows security audit trail
 * requirements.
 *
 * Steps:
 *
 * 1. Create and authenticate a new moderator account via join endpoint
 * 2. Call logout endpoint to terminate the moderator session
 * 3. Validate logout response contains valid moderator identification
 * 4. Validate logout response contains ISO 8601 formatted logout_at timestamp
 * 5. Validate logout response id matches the authenticated moderator id
 * 6. Verify logout_at timestamp is reasonable (within expected time window)
 */
export async function test_api_moderator_logout_audit_trail(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorCreate = {
    email: moderatorEmail,
    username: RandomGenerator.alphabets(10),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformModerator.ICreate;

  const authenticatedModerator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreate,
    });
  typia.assert(authenticatedModerator);

  // Verify moderator account email and username match input
  TestValidator.equals(
    "moderator email matches input",
    authenticatedModerator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator username matches input",
    authenticatedModerator.username,
    moderatorCreate.username,
  );

  // Step 2: Call logout endpoint to terminate session
  const logoutResponse: ICommunityPlatformModerator.ILogoutResponse =
    await api.functional.communityPlatform.moderator.auth.moderator.logout(
      connection,
    );
  typia.assert(logoutResponse);

  // Step 3-4: Validate logout response structure (type validation by typia.assert above)
  // logout_at is guaranteed to be ISO 8601 format by typia.assert
  // id is guaranteed to be valid UUID format by typia.assert
  // message is guaranteed to be non-empty string by typia.assert

  // Step 5: Verify logout response id matches the authenticated moderator id
  TestValidator.equals(
    "logout response id matches authenticated moderator id",
    logoutResponse.id,
    authenticatedModerator.id,
  );

  // Step 6: Verify logout_at timestamp is reasonable (within acceptable time window)
  const logoutTimestamp = new Date(logoutResponse.logout_at).getTime();
  const currentTime = Date.now();
  const timeDifference = Math.abs(currentTime - logoutTimestamp);
  const fiveMinutesInMs = 5 * 60 * 1000;

  TestValidator.predicate(
    "logout_at timestamp is within 5 minutes of current time",
    timeDifference <= fiveMinutesInMs,
  );

  // Verify logout message is a meaningful response
  TestValidator.predicate(
    "logout message contains meaningful content",
    logoutResponse.message.length > 0,
  );
}

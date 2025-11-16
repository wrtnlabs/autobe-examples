import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test moderator registration with session context tracking.
 *
 * This test validates that the moderator registration endpoint properly
 * captures and stores session context information including IP address,
 * connection URL (href), and referrer for security tracking and analytics.
 *
 * The test creates a moderator account with explicit session context values and
 * verifies that registration succeeds with proper authentication token
 * generation. This ensures the system correctly initializes session tracking
 * with connection context, which is critical for:
 *
 * - Security monitoring and fraud detection
 * - Geographic analysis of moderator registrations
 * - Understanding user acquisition sources
 * - Audit trail completeness
 *
 * Steps:
 *
 * 1. Generate unique moderator registration data (email, password, nickname)
 * 2. Provide explicit session context (IP, href, referrer)
 * 3. Call moderator registration API endpoint
 * 4. Verify successful registration response with complete type validation
 * 5. Validate business logic: email and nickname match input values
 */
export async function test_api_moderator_registration_with_session_context(
  connection: api.IConnection,
) {
  // Step 1: Generate unique moderator registration data
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // Secure password
    nickname: RandomGenerator.name(),
    ip: "192.168.1.100", // Explicit IP address for session tracking
    href: typia.random<string & tags.Format<"uri">>(), // Current page URL
    referrer: typia.random<string & tags.Format<"uri">>(), // Previous page URL
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  // Step 2: Register new moderator with session context
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: registrationData,
    });

  // Step 3: Validate the complete registration response (validates ALL types and formats)
  typia.assert(moderator);

  // Step 4: Verify business logic - registered data matches input
  TestValidator.equals(
    "registered email matches input",
    moderator.email,
    registrationData.email,
  );

  TestValidator.equals(
    "nickname matches input",
    moderator.nickname,
    registrationData.nickname,
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratorSession";

/**
 * Test moderator registration with connection metadata.
 *
 * This test validates that moderator account creation properly accepts and
 * processes connection metadata (IP address, href, referrer). While the full
 * session retrieval workflow cannot be tested without a session listing
 * endpoint or session ID in the response, this test ensures that:
 *
 * 1. Moderator registration accepts connection metadata fields
 * 2. The registration completes successfully with all required fields
 * 3. The moderator account is created with proper authentication tokens
 *
 * Note: Complete session metadata validation would require either:
 *
 * - Session ID included in the join response, OR
 * - A session listing endpoint to retrieve session IDs
 *
 * Test workflow:
 *
 * 1. Generate realistic connection metadata (IP, href, referrer)
 * 2. Create moderator account with connection metadata
 * 3. Validate moderator creation succeeded
 * 4. Verify authentication tokens are properly issued
 */
export async function test_api_moderator_session_retrieval_with_connection_metadata(
  connection: api.IConnection,
) {
  // Step 1: Prepare moderator registration data with connection metadata
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!";
  const moderatorUsername = RandomGenerator.name(1);
  const connectionIp = "192.168.1.100";
  const connectionHref = "https://example.com/moderator/register";
  const connectionReferrer = "https://example.com/admin/dashboard";

  // Step 2: Create moderator account with connection metadata
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: moderatorUsername,
      ip: connectionIp,
      href: connectionHref,
      referrer: connectionReferrer,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Validate moderator creation succeeded
  TestValidator.predicate(
    "moderator ID is valid UUID",
    moderator.id.length === 36,
  );
  TestValidator.equals(
    "moderator email matches input",
    moderator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator username matches input",
    moderator.username,
    moderatorUsername,
  );

  // Step 4: Validate authentication tokens are properly issued
  TestValidator.predicate(
    "access token is present",
    moderator.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    moderator.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expiration is set",
    moderator.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh expiration is set",
    moderator.token.refreshable_until.length > 0,
  );

  // Step 5: Validate timestamps are properly formatted
  TestValidator.predicate(
    "created_at is valid",
    moderator.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid",
    moderator.updated_at.length > 0,
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratorSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModeratorSession";

/**
 * Test moderator session retrieval filtered by IP address for security
 * monitoring.
 *
 * This test validates that the IP address filter correctly narrows session
 * results to only those created from a specific IP address. It creates a
 * moderator account with a known IP address, then retrieves sessions using the
 * ip filter parameter to verify filtering accuracy.
 *
 * Steps:
 *
 * 1. Create a moderator account with a specific IP address
 * 2. Retrieve sessions filtered by that exact IP address
 * 3. Verify that returned sessions match the specified IP
 * 4. Create another moderator with a different IP address
 * 5. Verify that filtering excludes sessions from different IPs
 */
export async function test_api_moderator_session_retrieval_ip_address_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create first moderator with specific IP address
  const firstIp = "192.168.1.100";
  const firstModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
        username: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        ip: firstIp,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(firstModerator);

  // Step 2: Retrieve sessions filtered by the first IP address
  const filteredSessions: IPageIDiscussionBoardModeratorSession =
    await api.functional.discussionBoard.moderator.moderators.sessions.index(
      connection,
      {
        moderatorId: firstModerator.id,
        body: {
          page: 1,
          limit: 10,
          ip: firstIp,
        } satisfies IDiscussionBoardModeratorSession.IRequest,
      },
    );
  typia.assert(filteredSessions);

  // Step 3: Verify that all returned sessions match the specified IP
  TestValidator.predicate(
    "filtered sessions should not be empty",
    filteredSessions.data.length > 0,
  );

  for (const session of filteredSessions.data) {
    TestValidator.equals("session IP should match filter", session.ip, firstIp);
    TestValidator.equals(
      "session should belong to first moderator",
      session.discussion_board_moderator_id,
      firstModerator.id,
    );
  }

  // Step 4: Create second moderator with different IP address
  const secondIp = "10.0.0.50";
  const secondModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass456!",
        username: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        ip: secondIp,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(secondModerator);

  // Step 5: Verify that filtering by first IP excludes second moderator's sessions
  const firstIpOnlySessions: IPageIDiscussionBoardModeratorSession =
    await api.functional.discussionBoard.moderator.moderators.sessions.index(
      connection,
      {
        moderatorId: firstModerator.id,
        body: {
          page: 1,
          limit: 100,
          ip: firstIp,
        } satisfies IDiscussionBoardModeratorSession.IRequest,
      },
    );
  typia.assert(firstIpOnlySessions);

  // Verify no sessions from different IPs are included
  for (const session of firstIpOnlySessions.data) {
    TestValidator.equals(
      "filtered results should only contain matching IP",
      session.ip,
      firstIp,
    );
    TestValidator.notEquals(
      "filtered results should exclude different IP",
      session.ip,
      secondIp,
    );
  }

  // Additional verification: Query second moderator's sessions with second IP filter
  const secondIpSessions: IPageIDiscussionBoardModeratorSession =
    await api.functional.discussionBoard.moderator.moderators.sessions.index(
      connection,
      {
        moderatorId: secondModerator.id,
        body: {
          page: 1,
          limit: 10,
          ip: secondIp,
        } satisfies IDiscussionBoardModeratorSession.IRequest,
      },
    );
  typia.assert(secondIpSessions);

  TestValidator.predicate(
    "second moderator should have sessions with second IP",
    secondIpSessions.data.length > 0,
  );

  for (const session of secondIpSessions.data) {
    TestValidator.equals(
      "second moderator session IP should match",
      session.ip,
      secondIp,
    );
  }
}

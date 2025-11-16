import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMemberSession";

/**
 * Test filtering member sessions by IP address.
 *
 * This test validates IP-based session filtering by:
 *
 * 1. Creating a new member account via join with a specific IP address
 * 2. Searching for sessions using the IP address filter
 * 3. Verifying that all returned sessions match the specified IP address
 * 4. Confirming the pagination structure is correct
 * 5. Validating that session details include the matching IP address field
 *
 * This tests the security monitoring capability where members can identify all
 * sessions originating from a specific network location, useful for detecting
 * unauthorized access from unfamiliar IP addresses.
 */
export async function test_api_member_sessions_filter_by_ip(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account with a specific IP address
  const testIp = "192.168.1.100";
  const memberEmail = typia.random<string & tags.Format<"email">>();

  const registrationData = {
    email: memberEmail,
    password: "TestPassword123!",
    username: RandomGenerator.name(),
    ip: testIp,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const authorizedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });

  typia.assert(authorizedMember);

  // Step 2: Search for sessions using the specific IP address filter
  const searchRequest = {
    page: 1,
    limit: 10,
    ip: testIp,
  } satisfies IDiscussionBoardMemberSession.IRequest;

  const sessionResults: IPageIDiscussionBoardMemberSession.ISummary =
    await api.functional.discussionBoard.member.members.sessions.index(
      connection,
      {
        memberId: authorizedMember.id,
        body: searchRequest,
      },
    );

  typia.assert(sessionResults);

  // Step 3: Verify at least one session exists
  TestValidator.predicate(
    "at least one session should be found",
    sessionResults.data.length > 0,
  );

  // Step 4: Verify all returned sessions match the specified IP address
  for (const session of sessionResults.data) {
    TestValidator.equals(
      "session IP should match the filter IP",
      session.ip,
      testIp,
    );

    TestValidator.equals(
      "session member ID should match",
      session.discussion_board_member_id,
      authorizedMember.id,
    );
  }

  // Step 5: Validate session member details match
  const firstSession = sessionResults.data[0];

  TestValidator.equals(
    "session member username should match authorized member",
    firstSession.member.username,
    authorizedMember.username,
  );
}

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
 * Test filtering member sessions by connection URL.
 *
 * This scenario validates href-based session filtering by:
 *
 * 1. Creating a new member account via join with a specific href value
 * 2. Searching for sessions using the href filter parameter
 * 3. Verifying that returned sessions are correctly filtered by the API
 * 4. Confirming the session data includes correct member information
 * 5. Validating the pagination structure and total count
 *
 * This tests the capability to identify sessions created from specific
 * application pages or entry points, useful for tracking user authentication
 * patterns and detecting unusual authentication flows.
 */
export async function test_api_member_sessions_filter_by_href(
  connection: api.IConnection,
) {
  // Step 1: Generate unique test data for member registration
  const uniqueEmail = typia.random<string & tags.Format<"email">>();
  const testHref = "https://example.com/discussion/login" satisfies string &
    tags.Format<"uri">;
  const testReferrer = "https://example.com/home" satisfies string &
    tags.Format<"uri">;

  // Step 2: Create a new member account with a specific href value
  const memberData = {
    email: uniqueEmail,
    password: "SecurePassword123!",
    username: RandomGenerator.name(),
    href: testHref,
    referrer: testReferrer,
  } satisfies IDiscussionBoardMember.ICreate;

  const authorizedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });

  typia.assert(authorizedMember);

  // Step 3: Verify the member was created successfully
  TestValidator.predicate(
    "member should have valid UUID",
    authorizedMember.id.length > 0,
  );

  TestValidator.equals(
    "member email should match",
    authorizedMember.email,
    uniqueEmail,
  );

  // Step 4: Search for sessions using href filter
  const sessionRequest = {
    page: 1,
    limit: 10,
    href: testHref,
  } satisfies IDiscussionBoardMemberSession.IRequest;

  const sessionPage: IPageIDiscussionBoardMemberSession.ISummary =
    await api.functional.discussionBoard.member.members.sessions.index(
      connection,
      {
        memberId: authorizedMember.id,
        body: sessionRequest,
      },
    );

  typia.assert(sessionPage);

  // Step 5: Validate pagination structure
  TestValidator.predicate(
    "session page should have pagination metadata",
    sessionPage.pagination !== null && sessionPage.pagination !== undefined,
  );

  TestValidator.predicate(
    "session data should be an array",
    Array.isArray(sessionPage.data),
  );

  TestValidator.predicate(
    "at least one session should be found",
    sessionPage.data.length > 0,
  );

  TestValidator.predicate(
    "pagination records should be positive",
    sessionPage.pagination.records > 0,
  );

  // Step 6: Verify that returned sessions belong to the correct member
  const firstSession = sessionPage.data[0];
  typia.assert(firstSession);

  TestValidator.equals(
    "session member ID should match authorized member",
    firstSession.discussion_board_member_id,
    authorizedMember.id,
  );

  TestValidator.predicate(
    "session should have valid UUID",
    firstSession.id.length > 0,
  );

  // Step 7: Verify session member information is included
  TestValidator.predicate(
    "session should include member summary",
    firstSession.member !== null && firstSession.member !== undefined,
  );

  TestValidator.equals(
    "session member ID should match",
    firstSession.member.id,
    authorizedMember.id,
  );

  TestValidator.equals(
    "session member email should match",
    firstSession.member.email,
    uniqueEmail,
  );

  // Step 8: Validate all returned sessions belong to the correct member
  for (const session of sessionPage.data) {
    TestValidator.equals(
      "session discussion_board_member_id should match authorized member",
      session.discussion_board_member_id,
      authorizedMember.id,
    );

    TestValidator.predicate(
      "session should have IP address",
      session.ip.length > 0,
    );

    TestValidator.predicate(
      "session should have created_at timestamp",
      session.created_at.length > 0,
    );
  }

  // Step 9: Validate pagination consistency
  TestValidator.equals(
    "pagination limit should match request",
    sessionPage.pagination.limit,
    sessionRequest.limit,
  );

  TestValidator.predicate(
    "pagination pages should be calculated correctly",
    sessionPage.pagination.pages ===
      Math.ceil(sessionPage.pagination.records / sessionPage.pagination.limit),
  );
}

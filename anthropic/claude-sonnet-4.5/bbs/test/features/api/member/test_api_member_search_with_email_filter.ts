import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";

/**
 * Test member search with email address filtering.
 *
 * This test validates that moderators can search for discussion board members
 * using email filter parameters. It creates a moderator account, then tests the
 * member search functionality with email-based filtering.
 *
 * The test verifies:
 *
 * 1. Moderator authentication and access to member search
 * 2. Email filter parameter correctly filters member results
 * 3. Search results contain only members matching the email criteria
 * 4. Pagination structure is correct and consistent
 *
 * This scenario is critical for moderators handling account-related support
 * requests and email verification issues.
 */
export async function test_api_member_search_with_email_filter(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: typia.random<string>(),
        username: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Search for members without email filter (baseline)
  const allMembersResult: IPageIDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(allMembersResult);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination should have valid structure",
    allMembersResult.pagination.current >= 0 &&
      allMembersResult.pagination.limit > 0 &&
      allMembersResult.pagination.records >= 0 &&
      allMembersResult.pagination.pages >= 0,
  );

  // Step 3: Test email filter with specific email
  const testEmail = typia.random<string & tags.Format<"email">>();
  const emailFilterResult: IPageIDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        page: 1,
        limit: 10,
        email: testEmail,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(emailFilterResult);

  // Validate that if results exist, they should match the email filter
  // Note: Results may be empty if no member has this email
  if (emailFilterResult.data.length > 0) {
    for (const member of emailFilterResult.data) {
      TestValidator.predicate(
        "member email should match or contain filter criteria",
        member.email === testEmail ||
          member.email.includes(testEmail) ||
          testEmail.includes(member.email),
      );
    }
  }

  // Step 4: Test with another email filter and different pagination
  const anotherEmail = typia.random<string & tags.Format<"email">>();
  const anotherFilterResult: IPageIDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        email: anotherEmail,
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(anotherFilterResult);

  // Validate pagination metadata
  TestValidator.equals(
    "current page should be 1",
    anotherFilterResult.pagination.current,
    1,
  );

  TestValidator.equals(
    "page limit should match request",
    anotherFilterResult.pagination.limit,
    20,
  );

  // Validate data array is present and correctly typed
  TestValidator.predicate(
    "result data should be an array",
    Array.isArray(anotherFilterResult.data),
  );
}

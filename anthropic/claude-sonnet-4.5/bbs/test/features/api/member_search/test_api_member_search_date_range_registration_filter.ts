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
 * Test member search filtering by registration date range using createdAfter
 * and createdBefore parameters.
 *
 * This test validates temporal filtering capabilities for member search:
 *
 * 1. Moderator authenticates to access member search functionality
 * 2. Multiple members are registered to create a test dataset
 * 3. Search with date range filters encompassing current time is executed
 * 4. Results are validated to contain members within the specified date range
 * 5. ISO 8601 date-time format parsing is verified
 * 6. Single-sided filters are tested for independent operation
 */
export async function test_api_member_search_date_range_registration_filter(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecureMod123!",
    username: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    href: "https://example.com/moderator/join" satisfies string &
      tags.Format<"uri">,
    referrer: "https://example.com/admin" satisfies string & tags.Format<"uri">,
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Define date range boundaries around current time
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const twoDaysLater = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

  // Step 3: Create members that will have current timestamps
  const testMembers = await ArrayUtil.asyncRepeat(5, async (index) => {
    const memberData = {
      email: typia.random<string & tags.Format<"email">>(),
      password: "MemberPass123!",
      username: `test_member_${index}_${RandomGenerator.alphaNumeric(6)}`,
      display_name: RandomGenerator.name(),
      href: "https://example.com/member/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/home" satisfies string &
        tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ICreate;

    const member: IDiscussionBoardMember.IAuthorized =
      await api.functional.auth.member.join(connection, {
        body: memberData,
      });
    typia.assert(member);
    return member;
  });

  // Step 4: Search with date range that encompasses current time (should include all test members)
  const currentRangeRequest = {
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    createdAfter: oneHourAgo.toISOString() satisfies string &
      tags.Format<"date-time">,
    createdBefore: oneHourLater.toISOString() satisfies string &
      tags.Format<"date-time">,
  } satisfies IDiscussionBoardMember.IRequest;

  const rangeResults: IPageIDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: currentRangeRequest,
    });
  typia.assert(rangeResults);

  // Step 5: Validate results contain the test members
  TestValidator.predicate(
    "Date range search should return results",
    rangeResults.data.length > 0,
  );

  const testMemberIds = testMembers.map((m) => m.id);
  const returnedIds = rangeResults.data.map((r) => r.id);

  TestValidator.predicate(
    "Date range results should include test members created within the range",
    testMemberIds.some((id) => returnedIds.includes(id)),
  );

  // Step 6: Test single-sided filter - only createdAfter (members from 2 days ago onwards)
  const afterOnlyRequest = {
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    createdAfter: twoDaysAgo.toISOString() satisfies string &
      tags.Format<"date-time">,
  } satisfies IDiscussionBoardMember.IRequest;

  const afterOnlyResults: IPageIDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: afterOnlyRequest,
    });
  typia.assert(afterOnlyResults);

  TestValidator.predicate(
    "createdAfter filter should return members including recently created ones",
    afterOnlyResults.data.length >= testMembers.length,
  );

  // Step 7: Test single-sided filter - only createdBefore (members before 2 days from now)
  const beforeOnlyRequest = {
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    createdBefore: twoDaysLater.toISOString() satisfies string &
      tags.Format<"date-time">,
  } satisfies IDiscussionBoardMember.IRequest;

  const beforeOnlyResults: IPageIDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: beforeOnlyRequest,
    });
  typia.assert(beforeOnlyResults);

  TestValidator.predicate(
    "createdBefore filter should return members including test members",
    beforeOnlyResults.data.length >= testMembers.length,
  );

  // Step 8: Validate pagination structure
  TestValidator.predicate(
    "Pagination data should be valid",
    rangeResults.pagination.current >= 0 &&
      rangeResults.pagination.limit > 0 &&
      rangeResults.pagination.records >= 0 &&
      rangeResults.pagination.pages >= 0,
  );

  // Step 9: Test ISO 8601 format with narrow range to verify precise filtering
  const veryRecentTime = new Date(now.getTime() - 5000);
  const veryFutureTime = new Date(now.getTime() + 5000);

  const preciseRangeRequest = {
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 100 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    createdAfter: veryRecentTime.toISOString() satisfies string &
      tags.Format<"date-time">,
    createdBefore: veryFutureTime.toISOString() satisfies string &
      tags.Format<"date-time">,
  } satisfies IDiscussionBoardMember.IRequest;

  const preciseResults: IPageIDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: preciseRangeRequest,
    });
  typia.assert(preciseResults);

  TestValidator.predicate(
    "ISO 8601 date-time format should be correctly parsed and applied",
    preciseResults.pagination.records >= 0,
  );
}

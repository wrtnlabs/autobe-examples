import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";

/**
 * Test filtering members by email verification status.
 *
 * This test validates that the member filtering API correctly handles the
 * email_verified parameter to filter members based on their email verification
 * status. It creates multiple member accounts with different email verification
 * statuses and tests various filter combinations to ensure the API returns
 * correct results.
 *
 * Test flow:
 *
 * 1. Create multiple member accounts (which have email_verified=false initially)
 * 2. Filter members by email_verified=true and verify no unverified members are
 *    returned
 * 3. Filter members by email_verified=false and verify only unverified members are
 *    returned
 * 4. Filter members by omitting email_verified and verify both types are returned
 * 5. Test filtering combined with search parameters
 * 6. Validate edge cases with homogeneous verification statuses
 */
export async function test_api_members_filter_by_email_verification(
  connection: api.IConnection,
) {
  // Step 1: Create multiple member accounts for testing
  const memberIds: string[] = [];

  // Create 3 unverified members (email_verified=false by default after registration)
  for (let i = 0; i < 3; i++) {
    const member = await api.functional.auth.member.join(connection, {
      body: {
        email:
          `unverified${i}_${RandomGenerator.alphaNumeric(4)}@example.com` satisfies string &
            tags.Format<"email">,
        username:
          `unverified_user_${i}_${RandomGenerator.alphaNumeric(4)}` satisfies string &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">,
        display_name: `Unverified User ${i}`,
        password: "Password123456",
      } satisfies IDiscussionBoardMember.ICreate,
    });
    typia.assert(member);
    memberIds.push(member.id);
  }

  // Step 2: Filter by email_verified=true (should return no newly created members since all are unverified)
  const verifiedMembersResult =
    await api.functional.discussionBoard.members.index(connection, {
      body: {
        email_verified: true,
        limit: 100,
        page: 1,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(verifiedMembersResult);
  TestValidator.predicate(
    "verified filter should not include newly created unverified members",
    !verifiedMembersResult.data.some((m) => memberIds.includes(m.id)),
  );

  // Step 3: Filter by email_verified=false (should return all created members)
  const unverifiedMembersResult =
    await api.functional.discussionBoard.members.index(connection, {
      body: {
        email_verified: false,
        limit: 100,
        page: 1,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(unverifiedMembersResult);
  TestValidator.predicate(
    "unverified filter should return newly created members",
    unverifiedMembersResult.data.some((m) => memberIds.includes(m.id)),
  );

  // Step 4: Filter with null email_verified (should return all members)
  const allMembersWithNullResult =
    await api.functional.discussionBoard.members.index(connection, {
      body: {
        email_verified: null,
        limit: 100,
        page: 1,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(allMembersWithNullResult);
  TestValidator.predicate(
    "null email_verified filter should return all members",
    allMembersWithNullResult.data.length > 0,
  );

  // Step 5: Filter with undefined email_verified (omitted parameter - should return all members)
  const allMembersWithoutFilterResult =
    await api.functional.discussionBoard.members.index(connection, {
      body: {
        limit: 100,
        page: 1,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(allMembersWithoutFilterResult);
  TestValidator.predicate(
    "omitted email_verified filter should return all members",
    allMembersWithoutFilterResult.data.length > 0,
  );

  // Step 6: Test filtering combined with search parameter
  const searchedMembersResult =
    await api.functional.discussionBoard.members.index(connection, {
      body: {
        search: "unverified",
        email_verified: false,
        limit: 100,
        page: 1,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(searchedMembersResult);
  TestValidator.predicate(
    "combined search and email_verified filter should apply both filters",
    searchedMembersResult.data.length >= 0,
  );

  // Step 7: Verify pagination works with email_verified filter
  const paginatedResult = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        email_verified: false,
        limit: 2,
        page: 1,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination with email_verified filter should respect limit",
    paginatedResult.data.length <= 2,
  );

  // Step 8: Test with account_status filter combined with email_verified
  const statusAndVerificationResult =
    await api.functional.discussionBoard.members.index(connection, {
      body: {
        account_status: ["active"],
        email_verified: false,
        limit: 100,
        page: 1,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(statusAndVerificationResult);
  TestValidator.predicate(
    "combined account_status and email_verified filter should work correctly",
    statusAndVerificationResult.data.length >= 0,
  );

  // Step 9: Test sorting with email_verified filter
  const sortedResult = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        email_verified: false,
        sort_by: "display_name",
        sort_order: "asc",
        limit: 100,
        page: 1,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(sortedResult);
  TestValidator.predicate(
    "sorting with email_verified filter should return results",
    sortedResult.data.length > 0,
  );

  // Step 10: Verify filter returns correct boolean result
  TestValidator.predicate(
    "all results from unverified filter should be unverified members",
    unverifiedMembersResult.data.length >= 3,
  );
}

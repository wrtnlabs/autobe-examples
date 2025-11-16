import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";

/**
 * Test sorting member lists by creation_at timestamp (account creation time).
 *
 * This test validates the member sorting functionality by:
 *
 * 1. Creating multiple member accounts at different times
 * 2. Verifying descending sort order (newest members first) - default behavior
 * 3. Verifying ascending sort order (oldest members first)
 * 4. Validating timestamp formatting is ISO 8601 compliant
 * 5. Testing pagination with sorted results maintains consistent order
 * 6. Testing sort order preserved when combined with filters
 */
export async function test_api_members_sort_by_creation_date(
  connection: api.IConnection,
) {
  // Create multiple members with time delays to ensure distinct creation timestamps
  const members: IDiscussionBoardMember.IAuthorized[] = [];

  // Create first member
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: `test.member.1.${RandomGenerator.alphaNumeric(8)}@example.com`,
      username: `testuser1_${RandomGenerator.alphaNumeric(6)}`,
      display_name: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member1);
  members.push(member1);

  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Create second member
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      email: `test.member.2.${RandomGenerator.alphaNumeric(8)}@example.com`,
      username: `testuser2_${RandomGenerator.alphaNumeric(6)}`,
      display_name: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member2);
  members.push(member2);

  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Create third member
  const member3 = await api.functional.auth.member.join(connection, {
    body: {
      email: `test.member.3.${RandomGenerator.alphaNumeric(8)}@example.com`,
      username: `testuser3_${RandomGenerator.alphaNumeric(6)}`,
      display_name: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member3);
  members.push(member3);

  // Test 1: Default sort order (descending - newest first)
  const descendingResult = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(descendingResult);

  // Verify descending order - newer members should appear first
  const descendingData = descendingResult.data;
  TestValidator.predicate(
    "descending results contain at least 3 members",
    descendingData.length >= 3,
  );

  // Find our created members in results and verify order
  const member3Idx = descendingData.findIndex((m) => m.id === member3.id);
  const member2Idx = descendingData.findIndex((m) => m.id === member2.id);
  const member1Idx = descendingData.findIndex((m) => m.id === member1.id);

  if (member3Idx !== -1 && member2Idx !== -1 && member1Idx !== -1) {
    TestValidator.predicate(
      "members appear in descending creation order (newest first)",
      member3Idx < member2Idx && member2Idx < member1Idx,
    );
  }

  // Verify pagination info
  TestValidator.predicate(
    "pagination current page is 1",
    descendingResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    descendingResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    descendingResult.pagination.records >= 0,
  );

  // Test 2: Ascending sort order (oldest first)
  const ascendingResult = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "asc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(ascendingResult);

  const ascendingData = ascendingResult.data;
  TestValidator.predicate(
    "ascending results contain at least 3 members",
    ascendingData.length >= 3,
  );

  // Find our created members in results and verify order
  const asc_member3Idx = ascendingData.findIndex((m) => m.id === member3.id);
  const asc_member2Idx = ascendingData.findIndex((m) => m.id === member2.id);
  const asc_member1Idx = ascendingData.findIndex((m) => m.id === member1.id);

  if (asc_member3Idx !== -1 && asc_member2Idx !== -1 && asc_member1Idx !== -1) {
    TestValidator.predicate(
      "members appear in ascending creation order (oldest first)",
      asc_member1Idx < asc_member2Idx && asc_member2Idx < asc_member3Idx,
    );
  }

  // Test 3: Verify ISO 8601 timestamp format
  if (descendingData.length > 0) {
    const member = descendingData[0];
    TestValidator.predicate(
      "created_at is ISO 8601 date-time format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(member.created_at),
    );
  }

  // Test 4: Test pagination with sorted results
  const page1Result = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
        page: 1,
        limit: 2,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(page1Result);

  TestValidator.predicate(
    "page 1 returns at most limit items",
    page1Result.data.length <= 2,
  );

  // Verify timestamps are in descending order on first page
  for (let i = 0; i < page1Result.data.length - 1; i++) {
    const current = new Date(page1Result.data[i].created_at).getTime();
    const next = new Date(page1Result.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `page 1 item ${i} timestamp is >= item ${i + 1} timestamp`,
      current >= next,
    );
  }

  // Test 5: Combine sorting with account_status filter
  const filteredResult = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        account_status: ["active"],
        sort_by: "created_at",
        sort_order: "desc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(filteredResult);

  // Verify all results are active
  for (const member of filteredResult.data) {
    TestValidator.equals(
      "filtered member account_status is active",
      member.account_status,
      "active",
    );
  }

  // Verify sort order is maintained even with filter
  for (let i = 0; i < filteredResult.data.length - 1; i++) {
    const current = new Date(filteredResult.data[i].created_at).getTime();
    const next = new Date(filteredResult.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `filtered result item ${i} timestamp is >= item ${i + 1} timestamp`,
      current >= next,
    );
  }

  // Test 6: Verify default sort_by is created_at
  const defaultResult = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(defaultResult);

  // Verify results follow descending order (assuming created_at is default)
  for (let i = 0; i < defaultResult.data.length - 1; i++) {
    const current = new Date(defaultResult.data[i].created_at).getTime();
    const next = new Date(defaultResult.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `default sort item ${i} timestamp is >= item ${i + 1} timestamp`,
      current >= next,
    );
  }
}

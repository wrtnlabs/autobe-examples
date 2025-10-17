import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";

export async function test_api_member_search_account_status_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create multiple member accounts with different data
  const memberCount = 7;
  const createdMembers: IDiscussionBoardMember.IAuthorized[] = [];

  for (let i = 0; i < memberCount; i++) {
    const member = await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
    typia.assert(member);
    createdMembers.push(member);
  }

  // Step 2: Search for members with 'pending_verification' status
  // All newly created members should have this status
  const pendingResults = await api.functional.discussionBoard.users.index(
    connection,
    {
      body: {
        account_status: "pending_verification",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(pendingResults);

  // Step 3: Verify pending_verification members are returned
  TestValidator.predicate(
    "pending verification results should not be empty",
    pendingResults.data.length > 0,
  );

  // Step 4: Verify all returned members have pending_verification status
  for (const member of pendingResults.data) {
    TestValidator.equals(
      "member account status should be pending_verification",
      member.account_status,
      "pending_verification",
    );
  }

  // Step 5: Verify at least some of our created members appear in results
  const createdMemberIds = createdMembers.map((m) => m.id);
  const foundCreatedMembers = pendingResults.data.filter((m) =>
    createdMemberIds.includes(m.id),
  );
  TestValidator.predicate(
    "at least some created members should appear in pending results",
    foundCreatedMembers.length > 0,
  );

  // Step 6: Test filtering by 'active' status (should return different results)
  const activeResults = await api.functional.discussionBoard.users.index(
    connection,
    {
      body: {
        account_status: "active",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(activeResults);

  // Verify all returned members have active status if any exist
  for (const member of activeResults.data) {
    TestValidator.equals(
      "member account status should be active",
      member.account_status,
      "active",
    );
  }

  // Step 7: Test filtering by 'suspended' status
  const suspendedResults = await api.functional.discussionBoard.users.index(
    connection,
    {
      body: {
        account_status: "suspended",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(suspendedResults);

  // Verify all returned members have suspended status if any exist
  for (const member of suspendedResults.data) {
    TestValidator.equals(
      "member account status should be suspended",
      member.account_status,
      "suspended",
    );
  }

  // Step 8: Test filtering by 'banned' status
  const bannedResults = await api.functional.discussionBoard.users.index(
    connection,
    {
      body: {
        account_status: "banned",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(bannedResults);

  // Verify all returned members have banned status if any exist
  for (const member of bannedResults.data) {
    TestValidator.equals(
      "member account status should be banned",
      member.account_status,
      "banned",
    );
  }

  // Step 9: Test filtering by 'deactivated' status
  const deactivatedResults = await api.functional.discussionBoard.users.index(
    connection,
    {
      body: {
        account_status: "deactivated",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(deactivatedResults);

  // Verify all returned members have deactivated status if any exist
  for (const member of deactivatedResults.data) {
    TestValidator.equals(
      "member account status should be deactivated",
      member.account_status,
      "deactivated",
    );
  }

  // Step 10: Test pagination with status filtering
  const paginatedResults = await api.functional.discussionBoard.users.index(
    connection,
    {
      body: {
        account_status: "pending_verification",
        page: 1,
        limit: 3,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(paginatedResults);

  // Verify pagination metadata
  TestValidator.predicate(
    "pagination limit should be respected",
    paginatedResults.data.length <= 3,
  );
  TestValidator.equals(
    "current page should be 1",
    paginatedResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be 3",
    paginatedResults.pagination.limit,
    3,
  );

  // Step 11: Test search without status filter (should return all members)
  const allMembersResults = await api.functional.discussionBoard.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 50,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(allMembersResults);

  // Verify results contain members
  TestValidator.predicate(
    "search without status filter should return members",
    allMembersResults.data.length > 0,
  );

  // Step 12: Verify our created members are in the unfiltered results
  const foundInAll = allMembersResults.data.filter((m) =>
    createdMemberIds.includes(m.id),
  );
  TestValidator.predicate(
    "created members should appear in unfiltered search",
    foundInAll.length > 0,
  );
}

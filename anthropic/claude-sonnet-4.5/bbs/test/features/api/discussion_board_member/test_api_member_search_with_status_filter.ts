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
 * Test member search with account status filtering.
 *
 * This test validates that moderators can search for members filtered by
 * specific account status values (active, suspended, or locked). It ensures the
 * status-based filtering works correctly and only returns members matching the
 * specified status.
 *
 * Test Process:
 *
 * 1. Create and authenticate as a moderator
 * 2. Search for members with status filter set to "active"
 * 3. Validate all returned members have status "active"
 * 4. Search for members with status filter set to "suspended"
 * 5. Validate all returned members have status "suspended"
 * 6. Search for members with status filter set to "locked"
 * 7. Validate all returned members have status "locked"
 * 8. Verify pagination metadata is correctly populated in responses
 */
export async function test_api_member_search_with_status_filter(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Test filtering by "active" status
  const activeRequest = {
    status: "active" as const,
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardMember.IRequest;

  const activeResult: IPageIDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: activeRequest,
    });
  typia.assert(activeResult);

  // Validate pagination metadata
  typia.assert(activeResult.pagination);
  TestValidator.predicate(
    "active members pagination has valid structure",
    activeResult.pagination.current >= 0 &&
      activeResult.pagination.limit > 0 &&
      activeResult.pagination.records >= 0 &&
      activeResult.pagination.pages >= 0,
  );

  // Validate all returned members have "active" status
  for (const member of activeResult.data) {
    TestValidator.equals(
      "member status should be active",
      member.status,
      "active",
    );
  }

  // Step 3: Test filtering by "suspended" status
  const suspendedRequest = {
    status: "suspended" as const,
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardMember.IRequest;

  const suspendedResult: IPageIDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: suspendedRequest,
    });
  typia.assert(suspendedResult);

  // Validate pagination metadata
  typia.assert(suspendedResult.pagination);
  TestValidator.predicate(
    "suspended members pagination has valid structure",
    suspendedResult.pagination.current >= 0 &&
      suspendedResult.pagination.limit > 0 &&
      suspendedResult.pagination.records >= 0 &&
      suspendedResult.pagination.pages >= 0,
  );

  // Validate all returned members have "suspended" status
  for (const member of suspendedResult.data) {
    TestValidator.equals(
      "member status should be suspended",
      member.status,
      "suspended",
    );
  }

  // Step 4: Test filtering by "locked" status
  const lockedRequest = {
    status: "locked" as const,
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardMember.IRequest;

  const lockedResult: IPageIDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: lockedRequest,
    });
  typia.assert(lockedResult);

  // Validate pagination metadata
  typia.assert(lockedResult.pagination);
  TestValidator.predicate(
    "locked members pagination has valid structure",
    lockedResult.pagination.current >= 0 &&
      lockedResult.pagination.limit > 0 &&
      lockedResult.pagination.records >= 0 &&
      lockedResult.pagination.pages >= 0,
  );

  // Validate all returned members have "locked" status
  for (const member of lockedResult.data) {
    TestValidator.equals(
      "member status should be locked",
      member.status,
      "locked",
    );
  }

  // Step 5: Test search without status filter (should return all statuses)
  const allStatusRequest = {
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardMember.IRequest;

  const allStatusResult: IPageIDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: allStatusRequest,
    });
  typia.assert(allStatusResult);

  // Validate pagination works without status filter
  typia.assert(allStatusResult.pagination);
  TestValidator.predicate(
    "all members pagination has valid structure",
    allStatusResult.pagination.current >= 0 &&
      allStatusResult.pagination.limit > 0 &&
      allStatusResult.pagination.records >= 0 &&
      allStatusResult.pagination.pages >= 0,
  );
}

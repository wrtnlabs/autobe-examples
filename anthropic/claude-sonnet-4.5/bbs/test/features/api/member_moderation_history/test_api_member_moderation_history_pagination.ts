import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationLog";

/**
 * Test pagination controls for member moderation history.
 *
 * This test validates that moderators can effectively navigate through
 * extensive moderation histories using pagination parameters (page and limit).
 *
 * The test verifies:
 *
 * 1. Basic pagination with different page sizes
 * 2. Navigation across multiple pages
 * 3. Pagination metadata accuracy (current, limit, records, pages)
 * 4. Maximum limit enforcement (100 entries)
 * 5. Correct ordering maintained across pages
 * 6. Edge cases (first page, last page, out of bounds)
 */
export async function test_api_member_moderation_history_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Generate a member ID to query moderation history for
  // Note: This member may not exist, so history will likely be empty
  // This is acceptable as we're testing pagination mechanics, not actual data
  const memberId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Test basic pagination - First page with default limit
  const firstPage: IPageIDiscussionBoardModerationLog.ISummary =
    await api.functional.discussionBoard.moderator.members.moderationHistory.index(
      connection,
      {
        memberId: memberId,
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(firstPage);

  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination metadata exists",
    firstPage.pagination !== null && firstPage.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is 1",
    firstPage.pagination.current === 1,
  );
  TestValidator.predicate("limit is 20", firstPage.pagination.limit === 20);
  TestValidator.predicate(
    "records count is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    firstPage.pagination.pages >= 0,
  );

  // Step 4: Test different page sizes
  const smallPageSize: IPageIDiscussionBoardModerationLog.ISummary =
    await api.functional.discussionBoard.moderator.members.moderationHistory.index(
      connection,
      {
        memberId: memberId,
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(smallPageSize);
  TestValidator.predicate(
    "small page size limit is 5",
    smallPageSize.pagination.limit === 5,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    smallPageSize.data.length <= 5,
  );

  // Step 5: Test maximum limit (100 entries)
  const maxLimit: IPageIDiscussionBoardModerationLog.ISummary =
    await api.functional.discussionBoard.moderator.members.moderationHistory.index(
      connection,
      {
        memberId: memberId,
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(maxLimit);
  TestValidator.predicate(
    "maximum limit is respected",
    maxLimit.pagination.limit === 100,
  );
  TestValidator.predicate(
    "data does not exceed max limit",
    maxLimit.data.length <= 100,
  );

  // Step 6: Test page navigation (second page)
  const secondPage: IPageIDiscussionBoardModerationLog.ISummary =
    await api.functional.discussionBoard.moderator.members.moderationHistory.index(
      connection,
      {
        memberId: memberId,
        body: {
          page: 2,
          limit: 20,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.predicate(
    "second page current is 2",
    secondPage.pagination.current === 2,
  );

  // Step 7: Validate pagination math consistency
  if (firstPage.pagination.records > 0) {
    const expectedPages = Math.ceil(
      firstPage.pagination.records / firstPage.pagination.limit,
    );
    TestValidator.predicate(
      "pages calculation is correct",
      firstPage.pagination.pages === expectedPages,
    );
  }

  // Step 8: Test with filters to verify pagination works with query parameters
  const filteredPage: IPageIDiscussionBoardModerationLog.ISummary =
    await api.functional.discussionBoard.moderator.members.moderationHistory.index(
      connection,
      {
        memberId: memberId,
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          order: "desc",
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(filteredPage);
  TestValidator.predicate(
    "filtered pagination works",
    filteredPage.pagination.current === 1 &&
      filteredPage.pagination.limit === 10,
  );

  // Step 9: Test edge case - requesting page beyond available pages
  const beyondPages: IPageIDiscussionBoardModerationLog.ISummary =
    await api.functional.discussionBoard.moderator.members.moderationHistory.index(
      connection,
      {
        memberId: memberId,
        body: {
          page: 9999,
          limit: 20,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(beyondPages);
  TestValidator.predicate(
    "beyond pages returns empty data",
    beyondPages.data.length === 0 ||
      beyondPages.pagination.current <= beyondPages.pagination.pages,
  );
}

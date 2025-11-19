import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountAction";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAccountAction";

/**
 * Test pagination controls for account action search endpoint.
 *
 * Validates that the pagination system correctly handles page number and limit
 * parameters when searching account actions. This test creates multiple account
 * actions and verifies that:
 *
 * 1. The limit parameter controls the number of results per page
 * 2. The page parameter navigates between result pages correctly
 * 3. Pagination metadata includes accurate current page, total pages, and total
 *    records
 * 4. Results are properly segmented across pages without duplication or omission
 *
 * The test authenticates as a moderator, creates test data (members and account
 * actions), then performs various pagination requests to validate the
 * pagination behavior.
 */
export async function test_api_account_action_pagination(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create multiple members for account actions (3 members)
  const members: IDiscussionBoardMember.IAuthorized[] =
    await ArrayUtil.asyncRepeat(3, async () => {
      const member = await api.functional.auth.member.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(12),
          username: RandomGenerator.alphaNumeric(8),
          display_name: RandomGenerator.name(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardMember.ICreate,
      });
      typia.assert(member);
      return member;
    });

  // Step 3: Create account actions for each member (moderator already authenticated)
  const createdActions: IDiscussionBoardAccountAction[] =
    await ArrayUtil.asyncRepeat(3, async (index) => {
      const action =
        await api.functional.discussionBoard.moderator.accountActions.create(
          connection,
          {
            body: {
              discussion_board_member_id: members[index].id,
              action_type: "suspension",
              reason: `Test suspension ${index + 1} - ${RandomGenerator.paragraph({ sentences: 2 })}`,
              duration_days: RandomGenerator.pick([1, 7, 14, 30] as const),
            } satisfies IDiscussionBoardAccountAction.ICreate,
          },
        );
      typia.assert(action);
      return action;
    });

  // Step 4: Test pagination with limit = 2, page = 1
  const page1Result: IPageIDiscussionBoardAccountAction.ISummary =
    await api.functional.discussionBoard.moderator.accountActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(page1Result);

  // Validate page 1 pagination metadata
  TestValidator.equals(
    "page 1 current page",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 2);
  TestValidator.equals(
    "page 1 total records",
    page1Result.pagination.records,
    3,
  );
  TestValidator.equals("page 1 total pages", page1Result.pagination.pages, 2);
  TestValidator.equals("page 1 data length", page1Result.data.length, 2);

  // Step 5: Test pagination with limit = 2, page = 2
  const page2Result: IPageIDiscussionBoardAccountAction.ISummary =
    await api.functional.discussionBoard.moderator.accountActions.index(
      connection,
      {
        body: {
          page: 2,
          limit: 2,
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(page2Result);

  // Validate page 2 pagination metadata
  TestValidator.equals(
    "page 2 current page",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2Result.pagination.limit, 2);
  TestValidator.equals(
    "page 2 total records",
    page2Result.pagination.records,
    3,
  );
  TestValidator.equals("page 2 total pages", page2Result.pagination.pages, 2);
  TestValidator.equals("page 2 data length", page2Result.data.length, 1);

  // Step 6: Verify no duplication between pages
  const page1Ids = page1Result.data.map((action) => action.id);
  const page2Ids = page2Result.data.map((action) => action.id);

  const allIds = [...page1Ids, ...page2Ids];
  const uniqueIds = [...new Set(allIds)];

  TestValidator.equals(
    "no duplicate IDs across pages",
    allIds.length,
    uniqueIds.length,
  );
  TestValidator.equals("total retrieved records", allIds.length, 3);

  // Step 7: Test different limit value (limit = 1)
  const smallLimitResult: IPageIDiscussionBoardAccountAction.ISummary =
    await api.functional.discussionBoard.moderator.accountActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(smallLimitResult);

  TestValidator.equals(
    "small limit page 1 data length",
    smallLimitResult.data.length,
    1,
  );
  TestValidator.equals(
    "small limit total pages",
    smallLimitResult.pagination.pages,
    3,
  );

  // Step 8: Test all records on single page (limit = 100, maximum allowed)
  const allRecordsResult: IPageIDiscussionBoardAccountAction.ISummary =
    await api.functional.discussionBoard.moderator.accountActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(allRecordsResult);

  TestValidator.equals(
    "all records data length",
    allRecordsResult.data.length,
    3,
  );
  TestValidator.equals(
    "all records total pages",
    allRecordsResult.pagination.pages,
    1,
  );
}

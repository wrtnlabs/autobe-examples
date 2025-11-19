import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAccountAction";

/**
 * Test pagination and sorting capabilities for member enforcement history
 * retrieval.
 *
 * This test validates that large enforcement histories can be navigated
 * efficiently with proper page controls and sort ordering. Creates multiple
 * account actions to test pagination behavior across pages and validates
 * sorting by various fields.
 *
 * Steps:
 *
 * 1. Create moderator account for authentication
 * 2. Create second moderator to serve as target member for actions
 * 3. Create 15+ account actions with varying properties
 * 4. Test default pagination (page 1)
 * 5. Test custom page sizes (limit variations)
 * 6. Test page navigation (pages 1, 2, 3)
 * 7. Test sorting by created_at (ascending and descending)
 * 8. Test sorting by action_type
 * 9. Test sorting by status
 * 10. Validate pagination metadata accuracy
 */
export async function test_api_account_action_history_pagination_and_sorting(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create another moderator to serve as the target member for actions
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.moderator.join(connection, {
    body: {
      email: memberEmail,
      password: "member123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(member);

  // Connection is already authenticated as moderator from first join
  // Switch back to moderator context by re-authenticating
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });

  // Step 3: Create 15 account actions with varying properties for pagination testing
  const actionTypes = ["suspension", "ban"] as const;
  const durations = [1, 7, 14, 30] as const;
  const createdActions = await ArrayUtil.asyncRepeat(15, async (index) => {
    const actionType = RandomGenerator.pick(actionTypes);
    const action =
      await api.functional.discussionBoard.moderator.accountActions.create(
        connection,
        {
          body: {
            discussion_board_member_id: member.id,
            action_type: actionType,
            reason: `${RandomGenerator.paragraph({ sentences: 2 })} - Action ${index + 1}`,
            duration_days:
              actionType === "suspension"
                ? RandomGenerator.pick(durations)
                : null,
          } satisfies IDiscussionBoardAccountAction.ICreate,
        },
      );
    typia.assert(action);
    return action;
  });

  TestValidator.equals("created 15 actions", createdActions.length, 15);

  // Step 4: Test default pagination (page 1, default limit)
  const defaultPage =
    await api.functional.discussionBoard.moderator.members.accountActions.index(
      connection,
      {
        memberId: member.id,
        body: {} satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(defaultPage);
  TestValidator.predicate("default page has data", defaultPage.data.length > 0);
  TestValidator.predicate(
    "default pagination metadata exists",
    defaultPage.pagination.current === 1 &&
      defaultPage.pagination.records === 15 &&
      defaultPage.pagination.pages >= 1,
  );

  // Step 5: Test custom page size with limit 5
  const page1Limit5 =
    await api.functional.discussionBoard.moderator.members.accountActions.index(
      connection,
      {
        memberId: member.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(page1Limit5);
  TestValidator.equals(
    "page 1 with limit 5 has 5 items",
    page1Limit5.data.length,
    5,
  );
  TestValidator.equals(
    "pagination current page is 1",
    page1Limit5.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 5",
    page1Limit5.pagination.limit,
    5,
  );
  TestValidator.equals(
    "pagination records total is 15",
    page1Limit5.pagination.records,
    15,
  );
  TestValidator.equals(
    "pagination pages is 3",
    page1Limit5.pagination.pages,
    3,
  );

  // Step 6: Test page navigation - page 2
  const page2Limit5 =
    await api.functional.discussionBoard.moderator.members.accountActions.index(
      connection,
      {
        memberId: member.id,
        body: {
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(page2Limit5);
  TestValidator.equals(
    "page 2 with limit 5 has 5 items",
    page2Limit5.data.length,
    5,
  );
  TestValidator.equals(
    "page 2 current is 2",
    page2Limit5.pagination.current,
    2,
  );

  // Step 7: Test page navigation - page 3
  const page3Limit5 =
    await api.functional.discussionBoard.moderator.members.accountActions.index(
      connection,
      {
        memberId: member.id,
        body: {
          page: 3,
          limit: 5,
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(page3Limit5);
  TestValidator.equals(
    "page 3 with limit 5 has 5 items",
    page3Limit5.data.length,
    5,
  );
  TestValidator.equals(
    "page 3 current is 3",
    page3Limit5.pagination.current,
    3,
  );

  // Step 8: Test sorting by created_at descending (newest first)
  const sortedByCreatedDesc =
    await api.functional.discussionBoard.moderator.members.accountActions.index(
      connection,
      {
        memberId: member.id,
        body: {
          sort_by: "created_at",
          order: "desc",
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(sortedByCreatedDesc);
  TestValidator.predicate(
    "sorted by created_at desc has data",
    sortedByCreatedDesc.data.length > 0,
  );

  // Validate descending order
  for (let i = 0; i < sortedByCreatedDesc.data.length - 1; i++) {
    const current = new Date(sortedByCreatedDesc.data[i].created_at).getTime();
    const next = new Date(sortedByCreatedDesc.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `created_at desc order at index ${i}`,
      current >= next,
    );
  }

  // Step 9: Test sorting by created_at ascending (oldest first)
  const sortedByCreatedAsc =
    await api.functional.discussionBoard.moderator.members.accountActions.index(
      connection,
      {
        memberId: member.id,
        body: {
          sort_by: "created_at",
          order: "asc",
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(sortedByCreatedAsc);

  // Validate ascending order
  for (let i = 0; i < sortedByCreatedAsc.data.length - 1; i++) {
    const current = new Date(sortedByCreatedAsc.data[i].created_at).getTime();
    const next = new Date(sortedByCreatedAsc.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `created_at asc order at index ${i}`,
      current <= next,
    );
  }

  // Step 10: Test sorting by action_type
  const sortedByActionType =
    await api.functional.discussionBoard.moderator.members.accountActions.index(
      connection,
      {
        memberId: member.id,
        body: {
          sort_by: "action_type",
          order: "asc",
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(sortedByActionType);
  TestValidator.predicate(
    "sorted by action_type has data",
    sortedByActionType.data.length > 0,
  );

  // Step 11: Test sorting by status
  const sortedByStatus =
    await api.functional.discussionBoard.moderator.members.accountActions.index(
      connection,
      {
        memberId: member.id,
        body: {
          sort_by: "status",
          order: "desc",
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(sortedByStatus);
  TestValidator.predicate(
    "sorted by status has data",
    sortedByStatus.data.length > 0,
  );

  // Step 12: Test maximum limit enforcement (100 items)
  const maxLimitPage =
    await api.functional.discussionBoard.moderator.members.accountActions.index(
      connection,
      {
        memberId: member.id,
        body: {
          limit: 100,
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(maxLimitPage);
  TestValidator.equals("max limit is 100", maxLimitPage.pagination.limit, 100);
  TestValidator.predicate(
    "respects max limit",
    maxLimitPage.data.length <= 100,
  );

  // Step 13: Test with limit 10 for different page size
  const page1Limit10 =
    await api.functional.discussionBoard.moderator.members.accountActions.index(
      connection,
      {
        memberId: member.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(page1Limit10);
  TestValidator.equals(
    "page 1 with limit 10 has 10 items",
    page1Limit10.data.length,
    10,
  );
  TestValidator.equals(
    "limit 10 pagination limit is 10",
    page1Limit10.pagination.limit,
    10,
  );
  TestValidator.equals(
    "limit 10 pagination pages is 2",
    page1Limit10.pagination.pages,
    2,
  );
}

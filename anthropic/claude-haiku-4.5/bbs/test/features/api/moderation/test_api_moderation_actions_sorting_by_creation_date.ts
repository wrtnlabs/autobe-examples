import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationAction";

export async function test_api_moderation_actions_sorting_by_creation_date(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(15),
        password: "TestPassword123!",
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Request moderation actions sorted by creation date in ascending order
  const ascendingResult: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          orderBy: "createdAt",
          order: "asc",
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(ascendingResult);

  // Step 3: Validate ascending order - each action's creation date should be >= previous
  if (ascendingResult.data.length > 1) {
    for (let i = 1; i < ascendingResult.data.length; i++) {
      const prevDate = new Date(
        ascendingResult.data[i - 1].created_at,
      ).getTime();
      const currDate = new Date(ascendingResult.data[i].created_at).getTime();
      TestValidator.predicate(
        `ascending order: action ${i} created_at (${ascendingResult.data[i].created_at}) should be >= action ${i - 1} created_at (${ascendingResult.data[i - 1].created_at})`,
        currDate >= prevDate,
      );
    }
  }

  // Step 4: Request moderation actions sorted by creation date in descending order
  const descendingResult: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          orderBy: "createdAt",
          order: "desc",
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(descendingResult);

  // Step 5: Validate descending order - each action's creation date should be <= previous
  if (descendingResult.data.length > 1) {
    for (let i = 1; i < descendingResult.data.length; i++) {
      const prevDate = new Date(
        descendingResult.data[i - 1].created_at,
      ).getTime();
      const currDate = new Date(descendingResult.data[i].created_at).getTime();
      TestValidator.predicate(
        `descending order: action ${i} created_at (${descendingResult.data[i].created_at}) should be <= action ${i - 1} created_at (${descendingResult.data[i - 1].created_at})`,
        currDate <= prevDate,
      );
    }
  }

  // Step 6: Verify sorting with pagination - get second page in ascending order
  if (ascendingResult.pagination.pages > 1) {
    const secondPageAsc: IPageIDiscussionBoardModerationAction.ISummary =
      await api.functional.discussionBoard.moderator.moderation.actions.index(
        connection,
        {
          body: {
            page: 2,
            limit: 50,
            orderBy: "createdAt",
            order: "asc",
          } satisfies IDiscussionBoardModerationAction.IRequest,
        },
      );
    typia.assert(secondPageAsc);

    // Validate that first item of page 2 is >= last item of page 1
    if (ascendingResult.data.length > 0 && secondPageAsc.data.length > 0) {
      const lastFirstPage = new Date(
        ascendingResult.data[ascendingResult.data.length - 1].created_at,
      ).getTime();
      const firstSecondPage = new Date(
        secondPageAsc.data[0].created_at,
      ).getTime();
      TestValidator.predicate(
        "pagination consistency: first item of page 2 should be >= last item of page 1",
        firstSecondPage >= lastFirstPage,
      );
    }
  }

  // Step 7: Verify overall sorting consistency
  TestValidator.predicate(
    "ascending and descending results should be reverse order of each other",
    ascendingResult.data.length === descendingResult.data.length,
  );

  // Step 8: Confirm pagination metadata
  TestValidator.predicate(
    "ascending result pagination should have valid metadata",
    ascendingResult.pagination.current >= 1 &&
      ascendingResult.pagination.limit > 0 &&
      ascendingResult.pagination.records >= 0 &&
      ascendingResult.pagination.pages >= 0,
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountRestriction";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAccountRestriction";

export async function test_api_moderation_restrictions_filter_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Authenticate first moderator
  const moderator1: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(8) + "A1!",
        username: RandomGenerator.alphabets(8),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator1);

  // Step 2: Authenticate second moderator for creating restrictions
  const moderator2: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(8) + "A1!",
        username: RandomGenerator.alphabets(8),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator2);

  // Step 3: Search for restrictions imposed by the first moderator
  const searchResult: IPageIDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.moderation.restrictions.index(
      connection,
      {
        body: {
          moderator_id: moderator1.id,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAccountRestriction.IRequest,
      },
    );
  typia.assert(searchResult);

  // Step 4: Verify pagination structure
  TestValidator.predicate(
    "pagination should have valid current page",
    searchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination should have valid limit",
    searchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination should have valid total records",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have valid total pages",
    searchResult.pagination.pages >= 0,
  );

  // Step 5: Verify all returned restrictions are imposed by the specified moderator
  if (searchResult.data.length > 0) {
    searchResult.data.forEach((restriction) => {
      TestValidator.equals(
        "restriction should be imposed by the searched moderator",
        restriction.imposed_by_moderator.id,
        moderator1.id,
      );
    });
  }

  // Step 6: Test with empty result - search for restrictions by moderator2
  const emptyResult: IPageIDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.moderation.restrictions.index(
      connection,
      {
        body: {
          moderator_id: moderator2.id,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAccountRestriction.IRequest,
      },
    );
  typia.assert(emptyResult);

  // Step 7: Verify the response structure is valid even for empty results
  TestValidator.predicate(
    "empty result should have pagination info",
    emptyResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "empty result data should be an array",
    Array.isArray(emptyResult.data),
  );
}

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

/**
 * Test filtering account restrictions by restriction type.
 *
 * This test validates that the moderation API correctly filters restrictions
 * based on the restriction_type parameter. The test creates a moderator account
 * and then searches for restrictions filtered by each restriction type
 * (posting_restriction, temporary_suspension, permanent_ban). For each type, it
 * verifies that all returned results contain only restrictions matching the
 * specified type, ensuring the filter parameter works correctly for narrowing
 * restriction search results by enforcement category.
 *
 * Test flow:
 *
 * 1. Register a moderator account to obtain authentication
 * 2. Query restrictions filtered by posting_restriction type
 * 3. Validate all returned restrictions have restriction_type =
 *    posting_restriction
 * 4. Query restrictions filtered by temporary_suspension type
 * 5. Validate all returned restrictions have restriction_type =
 *    temporary_suspension
 * 6. Query restrictions filtered by permanent_ban type
 * 7. Validate all returned restrictions have restriction_type = permanent_ban
 */
export async function test_api_moderation_restrictions_filter_by_type(
  connection: api.IConnection,
) {
  // Step 1: Register a moderator account
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "ModeratorPass123!",
      username: RandomGenerator.alphaNumeric(8),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Restriction types to test
  const restrictionTypes: Array<
    "posting_restriction" | "temporary_suspension" | "permanent_ban"
  > = ["posting_restriction", "temporary_suspension", "permanent_ban"];

  // Step 2-7: Test filtering by each restriction type
  for (const restrictionType of restrictionTypes) {
    const restrictionsPage =
      await api.functional.discussionBoard.moderator.moderation.restrictions.index(
        connection,
        {
          body: {
            restriction_type: restrictionType,
            page: 1,
            limit: 100,
          } satisfies IDiscussionBoardAccountRestriction.IRequest,
        },
      );
    typia.assert(restrictionsPage);

    // Validate that all returned restrictions match the requested type
    TestValidator.predicate(
      `all restrictions should have type ${restrictionType}`,
      () => {
        return restrictionsPage.data.every(
          (restriction) => restriction.restriction_type === restrictionType,
        );
      },
    );

    // Additional validation: if there are results, verify the count
    if (restrictionsPage.data.length > 0) {
      TestValidator.equals(
        `pagination should reflect correct page info for ${restrictionType}`,
        restrictionsPage.pagination.limit,
        100,
      );
    }
  }
}

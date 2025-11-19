import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserSuspension";

/**
 * Test filtering suspension records by moderator who imposed the restriction.
 *
 * A moderator authenticates and retrieves suspension records filtered by a
 * specific moderator ID. This test validates that the API correctly returns
 * only suspensions that were imposed by the specified moderator, enabling
 * performance assessment and consistency analysis of individual moderator
 * enforcement actions.
 *
 * Steps:
 *
 * 1. Create first moderator account (represents moderator imposing suspensions)
 * 2. Create second moderator account (will query suspensions)
 * 3. Second moderator queries suspensions filtered by first moderator's ID
 * 4. Validate that API returns properly paginated results
 * 5. Verify that all returned suspensions have the first moderator as the imposer
 * 6. Verify pagination structure and data integrity
 */
export async function test_api_moderation_suspensions_filter_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create first moderator account
  const moderator1Email = typia.random<string & tags.Format<"email">>();
  const moderator1 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator1Email,
      password: "ModeratorPass123!",
      username: RandomGenerator.alphaNumeric(8),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator1);
  TestValidator.predicate(
    "moderator1 created successfully",
    moderator1.id !== null && moderator1.id !== undefined,
  );

  // Step 2: Create second moderator account
  const moderator2Email = typia.random<string & tags.Format<"email">>();
  const moderator2 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator2Email,
      password: "ModeratorPass456!",
      username: RandomGenerator.alphaNumeric(8),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator2);
  TestValidator.predicate(
    "moderator2 created successfully",
    moderator2.id !== null && moderator2.id !== undefined,
  );

  // Step 3: Second moderator queries suspensions filtered by first moderator's ID
  // Note: The join call in Step 2 automatically authenticates moderator2
  const suspensionPage =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          moderator_id: moderator1.id,
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(suspensionPage);

  // Step 4: Validate pagination structure
  TestValidator.predicate(
    "pagination object exists",
    suspensionPage.pagination !== null &&
      suspensionPage.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is valid",
    suspensionPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is positive",
    suspensionPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    suspensionPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    suspensionPage.pagination.pages >= 0,
  );

  // Step 5: Validate that all returned suspensions have moderator1 as the imposer
  TestValidator.predicate(
    "data array exists",
    suspensionPage.data !== null && suspensionPage.data !== undefined,
  );
  if (suspensionPage.data.length > 0) {
    for (const suspension of suspensionPage.data) {
      TestValidator.equals(
        "suspension moderator ID matches filter",
        suspension.moderator.id,
        moderator1.id,
      );
      TestValidator.predicate(
        "suspension has moderator username",
        suspension.moderator.username !== null &&
          suspension.moderator.username !== undefined &&
          suspension.moderator.username.length > 0,
      );
    }
  }

  // Step 6: Query suspensions without moderator filter to verify API works with different parameters
  const allSuspensionsPage =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(allSuspensionsPage);
  TestValidator.predicate(
    "unfiltered suspensions query returns valid page",
    allSuspensionsPage.pagination !== null &&
      allSuspensionsPage.pagination !== undefined,
  );
  TestValidator.predicate(
    "unfiltered data array exists",
    allSuspensionsPage.data !== null && allSuspensionsPage.data !== undefined,
  );
}

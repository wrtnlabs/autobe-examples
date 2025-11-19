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
 * Test filtering suspensions by enforcement type.
 *
 * A moderator authenticates and retrieves only suspensions of type
 * 'posting_restriction' (excluding account_suspension and permanent_ban). This
 * test validates that the filter functionality correctly isolates suspensions
 * by their enforcement type, enabling moderators to analyze specific
 * restriction categories and understand which restrictions prevent
 * article/comment submissions while allowing login access.
 *
 * Test flow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Query suspensions with filter for posting_restriction type
 * 3. Validate that all returned suspensions match the posting_restriction type
 * 4. Confirm pagination and result structure are correct
 */
export async function test_api_moderation_suspensions_filter_by_type(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphabets(8) + "A1!";
  const moderatorUsername = RandomGenerator.alphabets(8);

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator created successfully",
    moderator.id !== null,
  );

  // Step 2: Query suspensions filtered by posting_restriction type
  const suspensionPage: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          suspension_type: "posting_restriction",
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(suspensionPage);

  // Step 3: Validate pagination structure
  TestValidator.predicate(
    "pagination exists in response",
    suspensionPage.pagination !== null &&
      suspensionPage.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is 1",
    suspensionPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is 20",
    suspensionPage.pagination.limit === 20,
  );
  TestValidator.predicate(
    "records count is non-negative",
    suspensionPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    suspensionPage.pagination.pages >= 0,
  );

  // Step 4: Validate data array exists
  TestValidator.predicate(
    "data array exists",
    Array.isArray(suspensionPage.data),
  );

  // Step 5: Validate all returned suspensions are posting_restriction type
  if (suspensionPage.data.length > 0) {
    for (const suspension of suspensionPage.data) {
      typia.assert(suspension);
      TestValidator.equals(
        "suspension type is posting_restriction",
        suspension.suspension_type,
        "posting_restriction",
      );
      TestValidator.predicate(
        "suspension has required id",
        suspension.id !== null && suspension.id !== undefined,
      );
      TestValidator.predicate(
        "suspension has moderator info",
        suspension.moderator !== null && suspension.moderator !== undefined,
      );
      TestValidator.predicate(
        "suspension has reason",
        suspension.reason !== null && suspension.reason !== undefined,
      );
      TestValidator.predicate(
        "suspension has severity level",
        suspension.severity_level !== null &&
          suspension.severity_level !== undefined,
      );
      TestValidator.predicate(
        "suspension has status",
        suspension.status !== null && suspension.status !== undefined,
      );
      TestValidator.predicate(
        "suspension has suspended_at timestamp",
        suspension.suspended_at !== null &&
          suspension.suspended_at !== undefined,
      );
    }
  } else {
    TestValidator.predicate(
      "empty results handled correctly",
      suspensionPage.pagination.records === 0,
    );
  }
}

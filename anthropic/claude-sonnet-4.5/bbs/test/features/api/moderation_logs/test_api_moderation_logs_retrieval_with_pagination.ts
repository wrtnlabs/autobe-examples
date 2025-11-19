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
 * Test retrieving paginated moderation logs as an authenticated moderator.
 *
 * This test validates the basic pagination functionality of the moderation log
 * audit trail. A moderator authenticates by joining (creating a new account),
 * then retrieves the first page of moderation logs with a specified page
 * limit.
 *
 * Steps:
 *
 * 1. Create and authenticate a moderator account via join operation
 * 2. Request the first page of moderation logs with pagination parameters
 * 3. Verify the response includes proper pagination metadata (current page, total
 *    records, total pages)
 * 4. Verify the data array contains moderation log summary entries
 */
export async function test_api_moderation_logs_retrieval_with_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorUsername = RandomGenerator.alphaNumeric(8);

  const moderatorCreateBody = {
    email: moderatorEmail,
    password: moderatorPassword,
    username: moderatorUsername,
    display_name: RandomGenerator.name(),
    ip: undefined,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const authenticatedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreateBody,
    });

  typia.assert(authenticatedModerator);

  // Step 2: Retrieve moderation logs with pagination parameters
  const paginationRequest = {
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardModerationLog.IRequest;

  const moderationLogsPage: IPageIDiscussionBoardModerationLog.ISummary =
    await api.functional.discussionBoard.moderator.moderationLogs.index(
      connection,
      {
        body: paginationRequest,
      },
    );

  // Step 3: Validate response structure - typia.assert performs complete validation
  typia.assert(moderationLogsPage);

  // Step 4: Verify business logic - pagination parameters match request
  TestValidator.equals(
    "pagination current page matches request",
    moderationLogsPage.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit matches request",
    moderationLogsPage.pagination.limit,
    20,
  );
}

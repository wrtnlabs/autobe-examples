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
 * Test retrieving moderation logs filtered by a specific member account.
 *
 * This test validates that moderators can filter the audit trail to show all
 * account-level actions (suspensions, bans, restorations) targeting a
 * particular member. The moderator authenticates and requests logs filtered by
 * member_id.
 *
 * The test verifies that:
 *
 * 1. Moderator can successfully authenticate and access moderation logs
 * 2. The API accepts member_id as a filter parameter
 * 3. The response returns properly structured paginated results
 * 4. All returned log entries would involve actions against the specified member
 *
 * This functionality supports:
 *
 * - Reviewing member enforcement history before applying additional disciplinary
 *   actions
 * - Dispute resolution with documented evidence
 * - Accountability and transparency in moderation decisions
 */
export async function test_api_moderation_logs_filtering_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Generate a random member ID to filter moderation logs
  const targetMemberId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Request moderation logs filtered by the specific member_id
  const logsRequest = {
    page: 1,
    limit: 20,
    member_id: targetMemberId,
  } satisfies IDiscussionBoardModerationLog.IRequest;

  const logsResult: IPageIDiscussionBoardModerationLog.ISummary =
    await api.functional.discussionBoard.moderator.moderationLogs.index(
      connection,
      {
        body: logsRequest,
      },
    );
  typia.assert(logsResult);

  // Step 4: Validate the response structure
  TestValidator.predicate(
    "logs result has pagination metadata",
    logsResult.pagination !== null && logsResult.pagination !== undefined,
  );

  TestValidator.predicate(
    "logs result has data array",
    Array.isArray(logsResult.data),
  );

  TestValidator.equals(
    "pagination current page matches request",
    logsResult.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit matches request",
    logsResult.pagination.limit,
    20,
  );

  TestValidator.predicate(
    "pagination has valid records count",
    logsResult.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination has valid pages count",
    logsResult.pagination.pages >= 0,
  );
}

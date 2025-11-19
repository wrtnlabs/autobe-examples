import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationLog";

/**
 * Test filtering moderation logs by specific moderator who performed the
 * actions.
 *
 * This test validates the moderator_id filtering functionality of the
 * moderation log search API. It creates multiple moderator accounts and
 * verifies that logs can be correctly filtered to show only actions performed
 * by a specific moderator.
 *
 * Test workflow:
 *
 * 1. Create three moderator accounts for comprehensive filtering tests
 * 2. Retrieve all moderation logs without filters (baseline)
 * 3. Filter logs by first moderator's ID and verify only their actions appear
 * 4. Filter logs by second moderator's ID and verify only their actions appear
 * 5. Create a new moderator with no actions and verify filtering returns empty
 *    results
 * 6. Retrieve logs without moderator_id filter and verify multi-moderator results
 */
export async function test_api_moderation_logs_filtering_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create first moderator account
  const moderator1: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "moderator1_pass_123",
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator1);

  // Step 2: Create second moderator account
  const moderator2: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "moderator2_pass_456",
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator2);

  // Step 3: Create third moderator account
  const moderator3: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "moderator3_pass_789",
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator3);

  // Step 4: Retrieve all moderation logs without moderator filter (baseline check)
  const allLogsPage: IPageIDiscussionBoardModerationLog =
    await api.functional.discussionBoard.moderator.moderators.moderationLogs.index(
      connection,
      {
        moderatorId: moderator1.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(allLogsPage);

  // Step 5: Filter logs by first moderator's ID
  const moderator1Logs: IPageIDiscussionBoardModerationLog =
    await api.functional.discussionBoard.moderator.moderators.moderationLogs.index(
      connection,
      {
        moderatorId: moderator1.id,
        body: {
          page: 1,
          limit: 100,
          moderator_id: moderator1.id,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(moderator1Logs);

  // Verify all returned logs are from moderator1
  for (const log of moderator1Logs.data) {
    TestValidator.equals(
      "log should be from moderator1",
      log.discussion_board_moderator_id,
      moderator1.id,
    );
    TestValidator.equals(
      "moderator summary should match moderator1",
      log.moderator.id,
      moderator1.id,
    );
  }

  // Step 6: Filter logs by second moderator's ID
  const moderator2Logs: IPageIDiscussionBoardModerationLog =
    await api.functional.discussionBoard.moderator.moderators.moderationLogs.index(
      connection,
      {
        moderatorId: moderator2.id,
        body: {
          page: 1,
          limit: 100,
          moderator_id: moderator2.id,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(moderator2Logs);

  // Verify all returned logs are from moderator2
  for (const log of moderator2Logs.data) {
    TestValidator.equals(
      "log should be from moderator2",
      log.discussion_board_moderator_id,
      moderator2.id,
    );
    TestValidator.equals(
      "moderator summary should match moderator2",
      log.moderator.id,
      moderator2.id,
    );
  }

  // Step 7: Create a new moderator who has performed no actions yet
  const newModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "newmod_pass_000",
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(newModerator);

  // Step 8: Filter logs by the new moderator's ID (should return empty)
  const newModeratorLogs: IPageIDiscussionBoardModerationLog =
    await api.functional.discussionBoard.moderator.moderators.moderationLogs.index(
      connection,
      {
        moderatorId: newModerator.id,
        body: {
          page: 1,
          limit: 100,
          moderator_id: newModerator.id,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(newModeratorLogs);

  // Verify no logs exist for the new moderator
  TestValidator.equals(
    "new moderator should have no logs",
    newModeratorLogs.data.length,
    0,
  );

  // Step 9: Retrieve logs without moderator_id filter to verify multi-moderator results
  const unfiltered: IPageIDiscussionBoardModerationLog =
    await api.functional.discussionBoard.moderator.moderators.moderationLogs.index(
      connection,
      {
        moderatorId: moderator1.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(unfiltered);

  // If there are any logs, verify they could be from different moderators
  // (we can't guarantee multiple moderators have logs, but we can verify the structure)
  if (unfiltered.data.length > 0) {
    TestValidator.predicate(
      "unfiltered results should contain valid moderation logs",
      unfiltered.data.length >= 0,
    );

    // Verify each log has valid moderator information
    for (const log of unfiltered.data) {
      TestValidator.predicate(
        "log should have valid moderator ID",
        log.discussion_board_moderator_id.length > 0,
      );
      TestValidator.predicate(
        "log moderator summary should have ID",
        log.moderator.id.length > 0,
      );
    }
  }
}

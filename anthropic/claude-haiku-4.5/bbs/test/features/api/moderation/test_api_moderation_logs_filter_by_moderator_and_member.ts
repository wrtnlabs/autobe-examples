import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationLog";

/**
 * Test moderation logs filtering by specific moderator and affected member.
 *
 * This test validates that moderators can audit enforcement actions by
 * filtering moderation logs with multiple criteria: specific moderator ID and
 * affected member ID. The system should return a complete and accurate history
 * of enforcement decisions taken by that moderator against that member.
 *
 * **Workflow:**
 *
 * 1. Create moderator account for taking enforcement actions
 * 2. Create member account to receive enforcement actions
 * 3. Create article content by member (potential target for enforcement)
 * 4. Search moderation logs filtered by moderator ID and affected member ID
 * 5. Validate filtered logs return correct enforcement history
 * 6. Verify pagination and filtering accuracy
 */
export async function test_api_moderation_logs_filter_by_moderator_and_member(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePassword123",
        ip: "192.168.1.100",
        href: "http://localhost:3000/auth/moderator",
        referrer: "http://localhost:3000",
      } satisfies IDiscussionBoardModerator.IJoin,
    });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator account created",
    moderator.account_status,
    "active",
  );

  // Step 2: Create a member account to receive enforcement actions
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPassword123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member);
  TestValidator.equals(
    "member account created",
    member.token.access.length > 0,
    true,
  );

  // Step 3: Create an article by the member (content that could trigger enforcement)
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 8,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);
  TestValidator.equals(
    "article created by member",
    article.author.id,
    member.id,
  );

  // Step 4: Search moderation logs filtered by moderator ID and affected member ID
  const logsResponse: IPageIDiscussionBoardModerationLog.IModerationLog =
    await api.functional.discussionBoard.moderator.moderation.logs.index(
      connection,
      {
        body: {
          page: 0,
          limit: 20,
          discussion_board_moderator_id: moderator.id,
          affected_discussion_board_member_id: member.id,
        } satisfies IDiscussionBoardModerationLog.IModerationLogsRequest,
      },
    );
  typia.assert(logsResponse);

  // Step 5: Validate pagination information
  TestValidator.equals(
    "pagination current page is 0",
    logsResponse.pagination.current,
    0,
  );
  TestValidator.equals(
    "pagination limit is 20",
    logsResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    logsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    logsResponse.pagination.pages >= 0,
  );

  // Step 6: Verify that response data is properly structured
  TestValidator.predicate(
    "logs data is an array",
    Array.isArray(logsResponse.data),
  );

  // Step 7: Validate all returned logs match the filter criteria
  if (logsResponse.data.length > 0) {
    for (const log of logsResponse.data) {
      typia.assert(log);
      TestValidator.equals(
        "log moderator ID matches filter",
        log.moderator_id,
        moderator.id,
      );
      TestValidator.predicate(
        "log has valid action type",
        typeof log.action_type === "string" && log.action_type.length > 0,
      );
      TestValidator.predicate(
        "log has valid target type",
        typeof log.target_type === "string" && log.target_type.length > 0,
      );
      TestValidator.predicate(
        "log has valid created timestamp",
        typeof log.created_at === "string" && log.created_at.length > 0,
      );
    }
  }

  // Step 8: Test filtering with different pagination parameters
  const secondPageLogs: IPageIDiscussionBoardModerationLog.IModerationLog =
    await api.functional.discussionBoard.moderator.moderation.logs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          discussion_board_moderator_id: moderator.id,
          affected_discussion_board_member_id: member.id,
        } satisfies IDiscussionBoardModerationLog.IModerationLogsRequest,
      },
    );
  typia.assert(secondPageLogs);
  TestValidator.equals(
    "second page query returns valid pagination",
    secondPageLogs.pagination.current,
    1,
  );

  // Step 9: Verify filtering by moderator ID only (without member filter)
  const moderatorOnlyLogs: IPageIDiscussionBoardModerationLog.IModerationLog =
    await api.functional.discussionBoard.moderator.moderation.logs.index(
      connection,
      {
        body: {
          page: 0,
          limit: 20,
          discussion_board_moderator_id: moderator.id,
        } satisfies IDiscussionBoardModerationLog.IModerationLogsRequest,
      },
    );
  typia.assert(moderatorOnlyLogs);
  TestValidator.predicate(
    "moderator-only filter returns valid response",
    Array.isArray(moderatorOnlyLogs.data),
  );

  // Step 10: Verify filtering by affected member ID only (without moderator filter)
  const memberOnlyLogs: IPageIDiscussionBoardModerationLog.IModerationLog =
    await api.functional.discussionBoard.moderator.moderation.logs.index(
      connection,
      {
        body: {
          page: 0,
          limit: 20,
          affected_discussion_board_member_id: member.id,
        } satisfies IDiscussionBoardModerationLog.IModerationLogsRequest,
      },
    );
  typia.assert(memberOnlyLogs);
  TestValidator.predicate(
    "member-only filter returns valid response",
    Array.isArray(memberOnlyLogs.data),
  );
}

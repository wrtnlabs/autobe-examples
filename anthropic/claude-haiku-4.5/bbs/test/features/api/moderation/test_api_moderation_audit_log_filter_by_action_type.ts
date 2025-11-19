import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardModeratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratorAuditLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModeratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModeratorAuditLog";

export async function test_api_moderation_audit_log_filter_by_action_type(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePassword123!";
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: RandomGenerator.name(1),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Retrieve audit log with filter for article_approved action type
  const auditLogResponse: IPageIDiscussionBoardModeratorAuditLog.ISummary =
    await api.functional.discussionBoard.moderator.moderation.audit_log.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          action_type: "article_approved",
        } satisfies IDiscussionBoardModeratorAuditLog.IRequest,
      },
    );
  typia.assert(auditLogResponse);

  // Step 3: Validate that all returned entries have the correct action type
  TestValidator.predicate(
    "audit log data should be array",
    Array.isArray(auditLogResponse.data),
  );

  // Step 4: Verify all entries have action_type = article_approved
  if (auditLogResponse.data.length > 0) {
    auditLogResponse.data.forEach((entry) => {
      TestValidator.equals(
        "entry action_type matches filter",
        entry.action_type,
        "article_approved",
      );
    });
  }

  // Step 5: Verify pagination information exists and is valid
  TestValidator.predicate(
    "pagination should exist",
    auditLogResponse.pagination !== null &&
      auditLogResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page should be positive",
    auditLogResponse.pagination.current > 0,
  );
  TestValidator.predicate(
    "limit should be positive",
    auditLogResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records should be non-negative",
    auditLogResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be non-negative",
    auditLogResponse.pagination.pages >= 0,
  );

  // Step 6: Test filtering with different action type to ensure filtering works
  const differentActionTypeResponse: IPageIDiscussionBoardModeratorAuditLog.ISummary =
    await api.functional.discussionBoard.moderator.moderation.audit_log.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          action_type: "comment_removed",
        } satisfies IDiscussionBoardModeratorAuditLog.IRequest,
      },
    );
  typia.assert(differentActionTypeResponse);

  // Step 7: Verify that entries from different filter have correct action type
  if (differentActionTypeResponse.data.length > 0) {
    differentActionTypeResponse.data.forEach((entry) => {
      TestValidator.equals(
        "entry action_type matches second filter",
        entry.action_type,
        "comment_removed",
      );
    });
  }

  // Step 8: Test without action_type filter to ensure all action types can be retrieved
  const unFilteredResponse: IPageIDiscussionBoardModeratorAuditLog.ISummary =
    await api.functional.discussionBoard.moderator.moderation.audit_log.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModeratorAuditLog.IRequest,
      },
    );
  typia.assert(unFilteredResponse);

  // Step 9: Verify unfiltered results contain pagination
  TestValidator.predicate(
    "unfiltered response should have pagination",
    unFilteredResponse.pagination !== null &&
      unFilteredResponse.pagination !== undefined,
  );

  // Step 10: Verify pagination works with limit parameter
  const limitedResponse: IPageIDiscussionBoardModeratorAuditLog.ISummary =
    await api.functional.discussionBoard.moderator.moderation.audit_log.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          action_type: "article_rejected",
        } satisfies IDiscussionBoardModeratorAuditLog.IRequest,
      },
    );
  typia.assert(limitedResponse);

  TestValidator.predicate(
    "returned data should not exceed limit",
    limitedResponse.data.length <= 10,
  );
}

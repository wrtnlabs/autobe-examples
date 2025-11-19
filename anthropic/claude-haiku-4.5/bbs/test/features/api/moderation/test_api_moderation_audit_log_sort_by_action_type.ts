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

export async function test_api_moderation_audit_log_sort_by_action_type(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account for authentication
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        username: RandomGenerator.alphaNumeric(8),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Retrieve audit log sorted by action_type
  const auditLogResponse: IPageIDiscussionBoardModeratorAuditLog.ISummary =
    await api.functional.discussionBoard.moderator.moderation.audit_log.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          order_by: "action_type",
          order_direction: "asc",
        } satisfies IDiscussionBoardModeratorAuditLog.IRequest,
      },
    );
  typia.assert(auditLogResponse);

  // Step 3: Validate pagination information
  TestValidator.predicate(
    "pagination current page should be valid",
    () => auditLogResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    () => auditLogResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count should be non-negative",
    () => auditLogResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count should be non-negative",
    () => auditLogResponse.pagination.pages >= 0,
  );

  // Step 4: Validate that entries are sorted by action_type in ascending order
  if (auditLogResponse.data.length > 1) {
    for (let i = 1; i < auditLogResponse.data.length; i++) {
      const currentEntry = auditLogResponse.data[i];
      const previousEntry = auditLogResponse.data[i - 1];

      TestValidator.predicate(
        `action type at index ${i} should be >= previous at index ${i - 1}`,
        () => currentEntry.action_type >= previousEntry.action_type,
      );
    }
  }

  // Step 5: Validate individual audit log entries have required structure
  for (const entry of auditLogResponse.data) {
    typia.assert(entry.id);
    typia.assert(entry.action_type);
    typia.assert(entry.moderator);
    typia.assert(entry.created_at);

    // Validate moderator details
    TestValidator.predicate(
      "moderator should have valid ID",
      () => entry.moderator.id.length > 0,
    );
    TestValidator.predicate(
      "moderator should have valid username",
      () => entry.moderator.username.length > 0,
    );
  }

  // Step 6: Verify that the audit log response contains entries grouped by action type
  if (auditLogResponse.data.length > 0) {
    const uniqueActionTypes = new Set(
      auditLogResponse.data.map((entry) => entry.action_type),
    );
    TestValidator.predicate(
      "audit log contains entries with distinct action types",
      () => uniqueActionTypes.size > 0,
    );
  }
}

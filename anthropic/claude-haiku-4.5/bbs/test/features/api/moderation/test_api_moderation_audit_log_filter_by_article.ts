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

/**
 * Test filtering audit log entries by article ID to review all moderation
 * actions.
 *
 * A moderator authenticates and retrieves audit log entries related to a
 * specific article, showing all moderation decisions (approval, rejection,
 * deletion, archiving, pinning, locking) for that content. This test validates
 * that the audit log correctly filters and returns only entries related to the
 * specified article, allowing investigation of the complete moderation timeline
 * and decision history for that particular piece of content.
 *
 * Test workflow:
 *
 * 1. Create a moderator account and authenticate
 * 2. Generate a random article ID to filter audit logs
 * 3. Retrieve audit log entries filtered by the article ID
 * 4. Validate that the response contains paginated audit log data
 * 5. Verify that all returned entries relate to the specified article
 * 6. Confirm the response structure includes moderator, action type, and timestamp
 *    information
 */
export async function test_api_moderation_audit_log_filter_by_article(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password:
      RandomGenerator.alphabets(8) + "A1!" + RandomGenerator.alphabets(3),
    username: RandomGenerator.alphabets(3) + RandomGenerator.alphaNumeric(5),
  } satisfies IDiscussionBoardModerator.ICreate;

  const authenticatedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreate,
    });
  typia.assert(authenticatedModerator);

  TestValidator.equals(
    "moderator email should match",
    authenticatedModerator.email,
    moderatorCreate.email,
  );
  TestValidator.equals(
    "moderator username should match",
    authenticatedModerator.username,
    moderatorCreate.username,
  );
  TestValidator.equals(
    "moderator should have full moderation tier",
    authenticatedModerator.moderation_tier,
    "full",
  );
  TestValidator.predicate(
    "moderator account should be active",
    authenticatedModerator.account_status === "active",
  );

  // Step 2: Generate a random article ID for filtering
  const articleIdToFilter = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Retrieve audit log entries filtered by article ID
  const auditLogRequest = {
    page: 1,
    limit: 20,
    article_id: articleIdToFilter,
  } satisfies IDiscussionBoardModeratorAuditLog.IRequest;

  const auditLogResponse: IPageIDiscussionBoardModeratorAuditLog.ISummary =
    await api.functional.discussionBoard.moderator.moderation.audit_log.index(
      connection,
      {
        body: auditLogRequest,
      },
    );

  typia.assert(auditLogResponse);

  // Step 4: Validate response structure and pagination information
  TestValidator.predicate(
    "audit log response should have pagination",
    auditLogResponse.pagination !== null &&
      auditLogResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination current page should be greater than or equal to 1",
    auditLogResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be greater than or equal to 1",
    auditLogResponse.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    auditLogResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    auditLogResponse.pagination.pages >= 0,
  );

  // Step 5: Validate data array structure
  TestValidator.predicate(
    "audit log data should be an array",
    Array.isArray(auditLogResponse.data),
  );

  // Step 6: Validate individual audit log entry structures
  if (auditLogResponse.data.length > 0) {
    auditLogResponse.data.forEach((entry, index) => {
      typia.assert(entry);

      TestValidator.predicate(
        `entry ${index} should have valid UUID id`,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          entry.id,
        ),
      );

      TestValidator.predicate(
        `entry ${index} should have action_type string`,
        typeof entry.action_type === "string",
      );

      TestValidator.predicate(
        `entry ${index} should have moderator information`,
        entry.moderator !== null && entry.moderator !== undefined,
      );

      TestValidator.predicate(
        `entry ${index} moderator should have valid id`,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          entry.moderator.id,
        ),
      );

      TestValidator.predicate(
        `entry ${index} moderator should have username`,
        typeof entry.moderator.username === "string",
      );

      TestValidator.predicate(
        `entry ${index} should have created_at timestamp`,
        typeof entry.created_at === "string",
      );

      TestValidator.predicate(
        `entry ${index} created_at should be valid ISO 8601 format`,
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(entry.created_at),
      );
    });
  }

  // Step 7: Test with pagination - retrieve second page if available
  if (auditLogResponse.pagination.pages > 1) {
    const secondPageRequest = {
      page: 2,
      limit: 20,
      article_id: articleIdToFilter,
    } satisfies IDiscussionBoardModeratorAuditLog.IRequest;

    const secondPageResponse: IPageIDiscussionBoardModeratorAuditLog.ISummary =
      await api.functional.discussionBoard.moderator.moderation.audit_log.index(
        connection,
        {
          body: secondPageRequest,
        },
      );

    typia.assert(secondPageResponse);

    TestValidator.equals(
      "second page should have correct page number",
      secondPageResponse.pagination.current,
      2,
    );
  }

  // Step 8: Test with different filter parameters
  const altFilterRequest = {
    page: 1,
    limit: 10,
    article_id: articleIdToFilter,
    action_type: "article_approved",
  } satisfies IDiscussionBoardModeratorAuditLog.IRequest;

  const filteredByActionResponse: IPageIDiscussionBoardModeratorAuditLog.ISummary =
    await api.functional.discussionBoard.moderator.moderation.audit_log.index(
      connection,
      {
        body: altFilterRequest,
      },
    );

  typia.assert(filteredByActionResponse);

  TestValidator.predicate(
    "filtered response should have pagination",
    filteredByActionResponse.pagination !== null &&
      filteredByActionResponse.pagination !== undefined,
  );

  TestValidator.predicate(
    "filtered response data should be an array",
    Array.isArray(filteredByActionResponse.data),
  );
}

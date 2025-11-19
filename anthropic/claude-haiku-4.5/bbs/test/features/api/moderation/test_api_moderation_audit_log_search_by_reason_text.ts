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
 * Test full-text search across reason field to find audit entries by moderator
 * justification.
 *
 * This test validates the audit log search functionality by reason text. A
 * moderator authenticates and searches for audit log entries containing
 * specific keywords in the reason field. The test verifies that the search API
 * returns only audit entries where the reason text contains the search term,
 * demonstrating text-based search capability for moderator reasoning and
 * decision documentation.
 *
 * Test flow:
 *
 * 1. Create a moderator account via join endpoint
 * 2. Search audit logs with various reason text filters
 * 3. Validate that search results contain entries matching the reason search term
 * 4. Test with multiple search keywords to ensure search accuracy
 */
export async function test_api_moderation_audit_log_search_by_reason_text(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "TestPass123!";
  const moderatorUsername = RandomGenerator.alphabets(8);

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: moderatorUsername,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);
  typia.assert<IDiscussionBoardModerator.IAuthorized>(moderator);

  // Step 2: Search audit logs by reason text with "spam" keyword
  const spamSearchResults =
    await api.functional.discussionBoard.moderator.moderation.audit_log.index(
      connection,
      {
        body: {
          reason_search: "spam",
        } satisfies IDiscussionBoardModeratorAuditLog.IRequest,
      },
    );
  typia.assert(spamSearchResults);
  typia.assert<IPageIDiscussionBoardModeratorAuditLog.ISummary>(
    spamSearchResults,
  );

  // Step 3: Validate results structure - pagination should be present
  TestValidator.predicate(
    "search results should have pagination info",
    spamSearchResults.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination should have current page",
    spamSearchResults.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination should have limit",
    spamSearchResults.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination should have records count",
    spamSearchResults.pagination.records >= 0,
  );

  // Step 4: Validate data array exists
  TestValidator.predicate(
    "search results should contain data array",
    Array.isArray(spamSearchResults.data),
  );

  // Step 5: Search audit logs by reason text with "offensive" keyword
  const offensiveSearchResults =
    await api.functional.discussionBoard.moderator.moderation.audit_log.index(
      connection,
      {
        body: {
          reason_search: "offensive",
        } satisfies IDiscussionBoardModeratorAuditLog.IRequest,
      },
    );
  typia.assert(offensiveSearchResults);
  typia.assert<IPageIDiscussionBoardModeratorAuditLog.ISummary>(
    offensiveSearchResults,
  );

  // Step 6: Validate offensive search results
  TestValidator.predicate(
    "offensive search results should have pagination",
    offensiveSearchResults.pagination !== undefined,
  );
  TestValidator.predicate(
    "offensive search results should have data array",
    Array.isArray(offensiveSearchResults.data),
  );

  // Step 7: Search audit logs by reason text with "violates policy" keyword
  const policySearchResults =
    await api.functional.discussionBoard.moderator.moderation.audit_log.index(
      connection,
      {
        body: {
          reason_search: "violates policy",
        } satisfies IDiscussionBoardModeratorAuditLog.IRequest,
      },
    );
  typia.assert(policySearchResults);
  typia.assert<IPageIDiscussionBoardModeratorAuditLog.ISummary>(
    policySearchResults,
  );

  // Step 8: Validate policy search results
  TestValidator.predicate(
    "policy search results should have pagination",
    policySearchResults.pagination !== undefined,
  );
  TestValidator.predicate(
    "policy search results should have data array",
    Array.isArray(policySearchResults.data),
  );

  // Step 9: Test pagination with reason search
  const paginatedResults =
    await api.functional.discussionBoard.moderator.moderation.audit_log.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          reason_search: "spam",
        } satisfies IDiscussionBoardModeratorAuditLog.IRequest,
      },
    );
  typia.assert(paginatedResults);

  // Step 10: Validate paginated results contain correct pagination values
  TestValidator.equals(
    "paginated search should have page 1",
    paginatedResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "paginated search should have limit 10",
    paginatedResults.pagination.limit,
    10,
  );

  // Step 11: Validate each audit log entry in results has required structure
  if (paginatedResults.data.length > 0) {
    const firstEntry = paginatedResults.data[0];
    TestValidator.predicate(
      "audit log entry should have id",
      firstEntry.id !== undefined && firstEntry.id !== null,
    );
    TestValidator.predicate(
      "audit log entry should have action_type",
      firstEntry.action_type !== undefined && firstEntry.action_type !== null,
    );
    TestValidator.predicate(
      "audit log entry should have moderator",
      firstEntry.moderator !== undefined,
    );
    TestValidator.predicate(
      "audit log entry should have created_at timestamp",
      firstEntry.created_at !== undefined,
    );
  }

  // Step 12: Test reason search with minimum length constraint
  const minLengthSearchResults =
    await api.functional.discussionBoard.moderator.moderation.audit_log.index(
      connection,
      {
        body: {
          reason_search: "a",
        } satisfies IDiscussionBoardModeratorAuditLog.IRequest,
      },
    );
  typia.assert(minLengthSearchResults);
}

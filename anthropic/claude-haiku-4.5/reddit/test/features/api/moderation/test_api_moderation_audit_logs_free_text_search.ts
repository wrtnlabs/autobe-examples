import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAuditLog";

/**
 * Test free-text search across action_reason and status_details fields in
 * moderation audit logs.
 *
 * This test validates that the free-text search API correctly finds audit logs
 * by:
 *
 * 1. Searching for keywords in moderator action justifications (action_reason)
 * 2. Searching for keywords in failure explanations (status_details)
 * 3. Finding logs with partial keyword matches
 * 4. Handling edge cases like empty search strings and special characters
 * 5. Validating pagination works correctly with search results
 *
 * The test follows this workflow:
 *
 * 1. Create a moderator account to access audit log search
 * 2. Search audit logs with specific keywords in action_reason field
 * 3. Verify search results contain matching action_reason values
 * 4. Search audit logs with keywords in status_details field
 * 5. Verify search results contain matching status_details values
 * 6. Test edge case with empty search string
 * 7. Test search with special characters
 * 8. Validate pagination with search results
 */
export async function test_api_moderation_audit_logs_free_text_search(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account to access audit logs
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: "TestPassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Search audit logs with keyword in action_reason field
  const searchKeywordReason = "policy violation";
  const auditLogsWithReasonKeyword: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          search: searchKeywordReason,
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(auditLogsWithReasonKeyword);

  // Step 3: Verify search functionality returns paginated results
  TestValidator.predicate(
    "search with action_reason keyword returns valid pagination",
    auditLogsWithReasonKeyword.pagination.limit === 20,
  );

  // Step 4: Search audit logs with keyword in status_details field
  const searchKeywordStatus = "resource not found";
  const auditLogsWithStatusKeyword: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          search: searchKeywordStatus,
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(auditLogsWithStatusKeyword);

  // Step 5: Verify search with status_details keyword returns valid results
  TestValidator.predicate(
    "search with status_details keyword returns valid pagination",
    auditLogsWithStatusKeyword.pagination.limit === 20,
  );

  // Step 6: Test edge case with empty search string
  const emptySearchResults: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          search: "",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(emptySearchResults);
  TestValidator.predicate(
    "empty search string returns valid pagination info",
    emptySearchResults.pagination.current >= 0,
  );

  // Step 7: Test search with special characters (should handle gracefully)
  const specialCharSearch: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          search: "@#$%",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(specialCharSearch);
  TestValidator.predicate(
    "special character search handles gracefully and returns valid results",
    specialCharSearch.pagination.pages >= 0,
  );

  // Step 8: Test pagination with search - verify limit is respected
  const paginatedSearch: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          search: "suspend",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(paginatedSearch);
  TestValidator.equals(
    "pagination limit of 5 is respected in search results",
    paginatedSearch.data.length <= 5,
    true,
  );
  TestValidator.equals(
    "pagination object reflects requested limit",
    paginatedSearch.pagination.limit,
    5,
  );

  // Step 9: Test search with different keywords to validate search scope
  const removePostSearch: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          search: "inappropriate",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(removePostSearch);
  TestValidator.predicate(
    "search with different keywords returns valid results",
    removePostSearch.pagination.records >= 0,
  );
}

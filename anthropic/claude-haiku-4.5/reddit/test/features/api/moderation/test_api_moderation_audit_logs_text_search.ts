import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAuditLog";

export async function test_api_moderation_audit_logs_text_search(
  connection: api.IConnection,
) {
  // 1. Administrator authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.alphaNumeric(8);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "SecurePassword123!",
        username: adminUsername,
        name: RandomGenerator.name(),
        href: "https://example.com/admin",
        referrer: "https://example.com",
        ip: "192.168.1.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);
  TestValidator.equals("admin authenticated", admin.email, adminEmail);

  // 2. Search audit logs with a specific search term
  const searchQuery = "policy violation";
  const searchResult: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: {
          search: searchQuery,
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(searchResult);

  // 3. Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    () => searchResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination has current page",
    () => searchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    () => searchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records",
    () => searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    () => searchResult.pagination.pages >= 0,
  );

  // 4. Validate search results contain search term
  const resultData = searchResult.data;
  TestValidator.predicate("results is array", () => Array.isArray(resultData));

  if (resultData.length > 0) {
    // Verify first result contains the search term in searchable fields
    const firstLog = resultData[0];
    const searchableContent =
      `${firstLog.action_reason} ${firstLog.status_details || ""}`.toLowerCase();
    const searchTermLower = searchQuery.toLowerCase();
    TestValidator.predicate(
      `first audit log contains search term "${searchQuery}"`,
      searchableContent.includes(searchTermLower),
    );
  }

  // 5. Test with different search parameters
  const altSearchQuery = "warning";
  const altSearchResult: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: {
          search: altSearchQuery,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(altSearchResult);

  // 6. Validate case-insensitive search with different cases
  const mixedCaseQuery = "VIOLATION";
  const mixedSearchResult: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: {
          search: mixedCaseQuery,
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(mixedSearchResult);

  // 7. Test pagination with search
  const pagedSearchResult: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: {
          search: searchQuery,
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(pagedSearchResult);
  TestValidator.predicate(
    "pagination limit is 5",
    () => pagedSearchResult.pagination.limit === 5,
  );

  // 8. Validate audit log structure
  if (searchResult.data.length > 0) {
    const firstLog = searchResult.data[0];
    TestValidator.predicate(
      "audit log has id",
      () => firstLog.id !== undefined,
    );
    TestValidator.predicate(
      "audit log has action_type",
      () => firstLog.action_type !== undefined,
    );
    TestValidator.predicate(
      "audit log has target_type",
      () => firstLog.target_type !== undefined,
    );
    TestValidator.predicate(
      "audit log has action_reason",
      () => firstLog.action_reason !== undefined,
    );
    TestValidator.predicate(
      "audit log has action_status",
      () => firstLog.action_status !== undefined,
    );
    TestValidator.predicate(
      "audit log has moderator",
      () => firstLog.moderator !== undefined,
    );
    TestValidator.predicate(
      "audit log has created_at",
      () => firstLog.created_at !== undefined,
    );
  }

  // 9. Test empty search results handling
  const uniqueSearchQuery = RandomGenerator.alphaNumeric(12);
  const emptySearchResult: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: {
          search: uniqueSearchQuery,
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(emptySearchResult);
  TestValidator.predicate("empty result structure is valid", () =>
    Array.isArray(emptySearchResult.data),
  );
}

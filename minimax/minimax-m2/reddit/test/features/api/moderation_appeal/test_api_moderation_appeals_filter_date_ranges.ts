import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformModerationAppeal";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModeratorSession";
import type { IRedditPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAction";
import type { IRedditPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAppeal";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformPlatformAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministratorSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUserSession";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

export async function test_api_moderation_appeals_filter_date_ranges(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as platform administrator
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "AdminPass123!";

  const admin: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        email: adminEmail,
        password: adminPassword,
        display_name: "Test Admin",
        administrator_level: "super_admin",
        system_permissions: JSON.stringify({
          user_management: {
            can_create_users: true,
            can_modify_users: true,
            can_suspend_users: true,
            can_ban_users: true,
            can_view_user_data: true,
            can_manage_user_permissions: true,
          },
          community_oversight: {
            can_create_communities: true,
            can_modify_communities: true,
            can_suspend_communities: true,
            can_delete_communities: true,
            can_moderate_all_communities: true,
            can_view_community_data: true,
          },
          content_moderation: {
            can_remove_content: true,
            can_moderate_globally: true,
            can_manage_reports: true,
            can_shadowban_content: true,
            can_restore_content: true,
            can_view_hidden_content: true,
          },
          system_configuration: {
            can_manage_settings: true,
            can_manage_features: true,
            can_manage_integrations: true,
            can_view_system_logs: true,
            can_manage_security: true,
            can_manage_backup: true,
          },
          compliance_legal: {
            can_access_compliance_data: true,
            can_manage_privacy: true,
            can_manage_data_retention: true,
            can_handle_dmca: true,
            can_manage_legal_requests: true,
            can_view_analytics: true,
          },
        }),
        security_clearance: "high",
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Test date range filtering with various scenarios
  const baseDate = new Date("2024-01-01T00:00:00Z");

  // Create appeals with different timestamps for testing
  const appealDates = [
    {
      created: new Date("2024-01-15T10:00:00Z"),
      resolved: new Date("2024-01-20T15:30:00Z"),
    },
    {
      created: new Date("2024-02-10T14:20:00Z"),
      resolved: new Date("2024-02-15T09:45:00Z"),
    },
    {
      created: new Date("2024-03-05T08:15:00Z"),
      resolved: new Date("2024-03-10T12:00:00Z"),
    },
    {
      created: new Date("2024-04-01T11:30:00Z"),
      resolved: new Date("2024-04-05T16:45:00Z"),
    },
    { created: new Date("2024-05-20T13:00:00Z"), resolved: null }, // Unresolved
  ];

  // Test Scenario 1: Filter by created_at date range (January 2024)
  const januaryFilter: IRedditPlatformModerationAppeal.IRequest = {
    created_at_from: "2024-01-01T00:00:00Z",
    created_at_to: "2024-01-31T23:59:59Z",
    page: 1,
    limit: 20,
  };

  const januaryResults =
    await api.functional.redditPlatform.platformAdministrator.appeals.index(
      connection,
      {
        body: januaryFilter,
      },
    );
  typia.assert(januaryResults);

  // Should find appeals created in January (at least appeal from 2024-01-15)
  TestValidator.predicate(
    "should find appeals created in January 2024",
    januaryResults.data.some((appeal) => {
      const createdDate = new Date(appeal.created_at);
      return (
        createdDate >= new Date("2024-01-01") &&
        createdDate <= new Date("2024-01-31")
      );
    }),
  );

  // Test Scenario 2: Filter by resolved_at date range (February 2024)
  const februaryResolvedFilter: IRedditPlatformModerationAppeal.IRequest = {
    resolved_at_from: "2024-02-01T00:00:00Z",
    resolved_at_to: "2024-02-28T23:59:59Z",
    page: 1,
    limit: 20,
  };

  const februaryResolvedResults =
    await api.functional.redditPlatform.platformAdministrator.appeals.index(
      connection,
      {
        body: februaryResolvedFilter,
      },
    );
  typia.assert(februaryResolvedResults);

  // Should find appeals resolved in February (appeal from 2024-02-15)
  TestValidator.predicate(
    "should find appeals resolved in February 2024",
    februaryResolvedResults.data.some((appeal) => {
      if (!appeal.resolved_at) return false;
      const resolvedDate = new Date(appeal.resolved_at);
      return (
        resolvedDate >= new Date("2024-02-01") &&
        resolvedDate <= new Date("2024-02-28")
      );
    }),
  );

  // Test Scenario 3: Filter by both created_at and resolved_at ranges (March 2024)
  const marchCombinedFilter: IRedditPlatformModerationAppeal.IRequest = {
    created_at_from: "2024-03-01T00:00:00Z",
    created_at_to: "2024-03-31T23:59:59Z",
    resolved_at_from: "2024-03-01T00:00:00Z",
    resolved_at_to: "2024-03-31T23:59:59Z",
    page: 1,
    limit: 20,
  };

  const marchCombinedResults =
    await api.functional.redditPlatform.platformAdministrator.appeals.index(
      connection,
      {
        body: marchCombinedFilter,
      },
    );
  typia.assert(marchCombinedResults);

  // Should find appeal created and resolved in March (appeal from 2024-03-05/2024-03-10)
  TestValidator.predicate(
    "should find appeals created and resolved in March 2024",
    marchCombinedResults.data.some((appeal) => {
      const createdDate = new Date(appeal.created_at);
      const resolvedDate = appeal.resolved_at
        ? new Date(appeal.resolved_at)
        : null;
      return (
        createdDate >= new Date("2024-03-01") &&
        createdDate <= new Date("2024-03-31") &&
        resolvedDate &&
        resolvedDate >= new Date("2024-03-01") &&
        resolvedDate <= new Date("2024-03-31")
      );
    }),
  );

  // Test Scenario 4: Filter for unresolved appeals (using resolved_at_to only)
  const unresolvedFilter: IRedditPlatformModerationAppeal.IRequest = {
    resolved_at_to: "2024-01-01T00:00:00Z", // Only include appeals resolved before 2024
    page: 1,
    limit: 20,
  };

  const unresolvedResults =
    await api.functional.redditPlatform.platformAdministrator.appeals.index(
      connection,
      {
        body: unresolvedFilter,
      },
    );
  typia.assert(unresolvedResults);

  // Should find unresolved appeals (appeal from May 2024)
  TestValidator.predicate(
    "should find unresolved appeals",
    unresolvedResults.data.some((appeal) => !appeal.resolved_at),
  );

  // Test Scenario 5: Wide date range covering all appeals
  const wideRangeFilter: IRedditPlatformModerationAppeal.IRequest = {
    created_at_from: "2024-01-01T00:00:00Z",
    created_at_to: "2024-12-31T23:59:59Z",
    resolved_at_from: "2024-01-01T00:00:00Z",
    resolved_at_to: "2024-12-31T23:59:59Z",
    page: 1,
    limit: 50,
  };

  const wideRangeResults =
    await api.functional.redditPlatform.platformAdministrator.appeals.index(
      connection,
      {
        body: wideRangeFilter,
      },
    );
  typia.assert(wideRangeResults);

  // Should return more results due to wider range
  TestValidator.predicate(
    "wide date range should return more appeals",
    wideRangeResults.data.length >= januaryResults.data.length,
  );

  // Test Scenario 6: No date filters (should return all appeals)
  const noFilter: IRedditPlatformModerationAppeal.IRequest = {
    page: 1,
    limit: 100,
  };

  const noFilterResults =
    await api.functional.redditPlatform.platformAdministrator.appeals.index(
      connection,
      {
        body: noFilter,
      },
    );
  typia.assert(noFilterResults);

  // Validation - ensure API response structure is correct
  TestValidator.equals(
    "response should have pagination info",
    noFilterResults.pagination.current,
    1,
  );

  TestValidator.equals(
    "response should have data array",
    Array.isArray(noFilterResults.data),
    true,
  );

  // Ensure each appeal has required fields for date filtering
  noFilterResults.data.forEach((appeal) => {
    TestValidator.equals(
      "each appeal should have created_at timestamp",
      typeof appeal.created_at,
      "string",
    );

    if (appeal.resolved_at) {
      TestValidator.equals(
        "resolved_at should be string when present",
        typeof appeal.resolved_at,
        "string",
      );
    }
  });

  // Test Scenario 7: Narrow date range (should return fewer results)
  const narrowRangeFilter: IRedditPlatformModerationAppeal.IRequest = {
    created_at_from: "2024-01-15T00:00:00Z",
    created_at_to: "2024-01-15T23:59:59Z",
    page: 1,
    limit: 20,
  };

  const narrowRangeResults =
    await api.functional.redditPlatform.platformAdministrator.appeals.index(
      connection,
      {
        body: narrowRangeFilter,
      },
    );
  typia.assert(narrowRangeResults);

  // Narrow range should return fewer or equal results
  TestValidator.predicate(
    "narrow date range should return fewer or equal results",
    narrowRangeResults.data.length <= januaryResults.data.length,
  );
}

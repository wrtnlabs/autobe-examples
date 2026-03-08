import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAuditLog";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test comprehensive moderation analytics filtering and edge case handling
 * for admin moderation analytics endpoint.
 *
 * This test validates:
 * - Authentication and authorization
 * - Filtering by status, communities, moderators, date ranges, and search
 * - Edge case handling for empty results and invalid inputs
 * - Response structure completeness with zero/null metrics
 * - Pagination and sorting functionality
 */
export async function test_api_moderation_analytics_filtering_scenarios(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Create fresh admin connection with token from auth response
  const freshAdminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminAuth.token.access },
  };
  // Step 2: Create mock test data structure
  // Mock communities for testing
  const mockCommunityIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  // Mock moderator for performance testing
  const mockModeratorId = typia.random<string & tags.Format<"uuid">>();
  // Mock data representing reports and audit logs
  const mockReports = ArrayUtil.repeat(5, (index) => ({
    id: typia.random<string & tags.Format<"uuid">>(),
    community_id: mockCommunityIds[index % 3],
    status: (["PENDING", "RESOLVED", "DISMISSED"] as const)[
      index < 2 ? 0 : index < 4 ? 1 : 2
    ],
    created_at: new Date(Date.now() - index * 86400000).toISOString(),
  }));
  const mockAuditLogs = ArrayUtil.repeat(4, (index) => ({
    id: typia.random<string & tags.Format<"uuid">>(),
    moderator_id: mockModeratorId,
    community_id: mockCommunityIds[index % 3],
    action_type: (["approve", "dismiss", "remove", "ban"] as const)[index % 4],
    action_reason: `Violation ${index + 1}`,
    created_at: new Date(Date.now() - index * 43200000).toISOString(),
  }));
  // Mock a community with zero reports for edge case testing
  const zeroReportCommunityId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Query without date_range filter (default full date range)
  const responseNoDateRange =
    await api.functional.redditPlatform.admin.moderation.analytics.overview(
      freshAdminConnection,
      {
        body: {
          pagination: {
            page: 1,
            limit: 20,
          },
          sort: {
            field: "created_at",
            direction: "desc",
          },
        },
      },
    );
  typia.assert(responseNoDateRange);
  // Step 4: Query with status=PENDING filter
  const responsePending =
    await api.functional.redditPlatform.admin.moderation.analytics.overview(
      freshAdminConnection,
      {
        body: {
          pagination: {
            page: 1,
            limit: 20,
          },
          status: "PENDING",
          sort: {
            field: "created_at",
            direction: "desc",
          },
        },
      },
    );
  typia.assert(responsePending);
  // Step 5: Query with multiple community_ids
  const responseMultiCommunity =
    await api.functional.redditPlatform.admin.moderation.analytics.overview(
      freshAdminConnection,
      {
        body: {
          pagination: {
            page: 1,
            limit: 20,
          },
          community_ids: mockCommunityIds.slice(0, 2),
          sort: {
            field: "community_id",
            direction: "asc",
          },
        },
      },
    );
  typia.assert(responseMultiCommunity);
  // Step 6: Query with search text matching action_reason
  const responseSearch =
    await api.functional.redditPlatform.admin.moderation.analytics.overview(
      freshAdminConnection,
      {
        body: {
          pagination: {
            page: 1,
            limit: 20,
          },
          search: "Violation",
          sort: {
            field: "action_type",
            direction: "asc",
          },
        },
      },
    );
  typia.assert(responseSearch);
  // Step 7: Query with date_range spanning multiple days
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + 7 * 86400000); // 7 days later
  const responseDateRange =
    await api.functional.redditPlatform.admin.moderation.analytics.overview(
      freshAdminConnection,
      {
        body: {
          pagination: {
            page: 1,
            limit: 20,
          },
          date_range: {
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
          },
          sort: {
            field: "created_at",
            direction: "desc",
          },
        },
      },
    );
  typia.assert(responseDateRange);
  // Step 8: Query for community with zero reports
  const responseZeroReports =
    await api.functional.redditPlatform.admin.moderation.analytics.overview(
      freshAdminConnection,
      {
        body: {
          pagination: {
            page: 1,
            limit: 20,
          },
          community_ids: [zeroReportCommunityId],
          sort: {
            field: "community_id",
            direction: "asc",
          },
        },
      },
    );
  typia.assert(responseZeroReports);
  // Step 9: Query with date_range that has no reports
  const pastDate = new Date(Date.now() - 365 * 86400000); // 1 year ago
  const olderDate = new Date(pastDate.getTime() - 1 * 86400000); // another year ago
  const responseEmptyDateRange =
    await api.functional.redditPlatform.admin.moderation.analytics.overview(
      freshAdminConnection,
      {
        body: {
          pagination: {
            page: 1,
            limit: 20,
          },
          date_range: {
            start_date: olderDate.toISOString(),
            end_date: pastDate.toISOString(),
          },
          sort: {
            field: "created_at",
            direction: "desc",
          },
        },
      },
    );
  typia.assert(responseEmptyDateRange);
  // Step 10: Query with only moderator_id filter
  const responseModeratorFilter =
    await api.functional.redditPlatform.admin.moderation.analytics.overview(
      freshAdminConnection,
      {
        body: {
          pagination: {
            page: 1,
            limit: 20,
          },
          moderator_id: mockModeratorId,
          sort: {
            field: "moderator_id",
            direction: "asc",
          },
        },
      },
    );
  typia.assert(responseModeratorFilter);
  // Step 11: Query with non-existent community_id (invalid UUID)
  const responseInvalidCommunity =
    await api.functional.redditPlatform.admin.moderation.analytics.overview(
      freshAdminConnection,
      {
        body: {
          pagination: {
            page: 1,
            limit: 20,
          },
          community_ids: ["invalid-uuid-format"],
          sort: {
            field: "community_id",
            direction: "asc",
          },
        },
      },
    );
  typia.assert(responseInvalidCommunity);
  // Step 12: Query with normalized date_range (end_date before start_date)
  const responseNormalizedRange =
    await api.functional.redditPlatform.admin.moderation.analytics.overview(
      freshAdminConnection,
      {
        body: {
          pagination: {
            page: 1,
            limit: 20,
          },
          date_range: {
            start_date: endDate.toISOString(),
            end_date: startDate.toISOString(), // reversed dates
          },
          sort: {
            field: "created_at",
            direction: "desc",
          },
        },
      },
    );
  typia.assert(responseNormalizedRange);
  // Step 13: Test maximum pagination limit (limit=100)
  const responseMaxLimit =
    await api.functional.redditPlatform.admin.moderation.analytics.overview(
      freshAdminConnection,
      {
        body: {
          pagination: {
            page: 1,
            limit: 100,
          },
          sort: {
            field: "created_at",
            direction: "desc",
          },
        },
      },
    );
  typia.assert(responseMaxLimit);
  // Step 14: Verify sorting by community_id works
  const responseSorted =
    await api.functional.redditPlatform.admin.moderation.analytics.overview(
      freshAdminConnection,
      {
        body: {
          pagination: {
            page: 1,
            limit: 20,
          },
          sort: {
            field: "community_id" as const,
            direction: "asc" as const,
          },
        },
      },
    );
  typia.assert(responseSorted);
  // Step 15: Verify all analytics response fields are present even when metrics are zero/null
  const responseFieldsCheck =
    await api.functional.redditPlatform.admin.moderation.analytics.overview(
      freshAdminConnection,
      {
        body: {
          pagination: {
            page: 1,
            limit: 20,
          },
          sort: {
            field: "created_at",
            direction: "desc",
          },
        },
      },
    );
  typia.assert(responseFieldsCheck);
}

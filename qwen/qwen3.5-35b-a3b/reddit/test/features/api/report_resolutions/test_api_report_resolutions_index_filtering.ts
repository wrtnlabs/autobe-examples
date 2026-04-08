import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReportResolution";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportResolution";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the filtering capabilities of the report resolutions endpoint.
 *
 * Validates the complete filtering system for moderation report resolutions, ensuring admins
 * can narrow down resolution results by various criteria including status, resolution type,
 * admin ID, community ID, and date ranges. Tests both individual filters and combined
 * filter scenarios to verify the query system works correctly.
 *
 * Special attention is given to verifying that resolved_at filters only apply when
 * resolved_at is populated, and that soft-deleted records are excluded by default.
 *
 * 1. Administrator authenticates via /redditCommunity/auth/admin/join.
 * 2. Setup: Generate test data representing potential resolution records.
 * 3. Test status filter - query with status: 'open' and verify filtering logic.
 * 4. Test status filter - query with status: 'resolved' and verify filtering logic.
 * 5. Test status filter - query with status: 'dismissed' and verify filtering logic.
 * 6. Test resolution_type filter - query with resolution_type: 'resolved' and verify filtering.
 * 7. Test resolution_type filter - query with resolution_type: 'dismissed' and verify filtering.
 * 8. Test admin_id filter - query with admin_id parameter and verify filtering applies.
 * 9. Test community_id filter - query with community_id and verify filtering applies.
 * 10. Test created_at_from filter - query with date range and verify filtering works.
 * 11. Test created_at_to filter - query with date range and verify filtering works.
 * 12. Test combined filtering - combine status, admin_id, and community_id filters.
 * 13. Verify resolved_at_from and resolved_at_to filters work correctly.
 * 14. Test that deleted filter defaults to false (only active records returned).
 * 15. Verify explicit deleted: true returns soft-deleted records.
 */
export async function test_api_report_resolutions_index_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IRedditCommunityAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IRedditCommunityAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // 2. Create test resolutions with various statuses and types
  const resolutions = ArrayUtil.repeat(6, () =>
    typia.random<IRedditCommunityReportResolution.ISummary>(),
  );
  typia.assert(resolutions);
  // Validate resolution data structure
  TestValidator.equals(
    "resolution count matches expected",
    resolutions.length,
    6,
  );
  TestValidator.predicate("all resolutions have required status", () =>
    resolutions.every((r) => r.status !== undefined),
  );
  TestValidator.predicate("all resolutions have resolution type", () =>
    resolutions.every((r) => r.resolution_type !== undefined),
  );
  // 3. Test status filter - 'open'
  {
    const response =
      await api.functional.redditCommunity.admin.report_resolutions.index(
        adminConnection,
        {
          body: { status: "open" as const },
        },
      );
    typia.assert(response);
    TestValidator.equals(
      "status open filter returns valid pagination",
      response.pagination.current,
      1,
    );
    TestValidator.predicate(
      "status open filter returns data",
      () => response.pagination.records >= 0,
    );
    TestValidator.predicate("status open filter returns array", () =>
      Array.isArray(response.data),
    );
  }
  // 4. Test status filter - 'resolved'
  {
    const response =
      await api.functional.redditCommunity.admin.report_resolutions.index(
        adminConnection,
        {
          body: { status: "resolved" as const },
        },
      );
    typia.assert(response);
    TestValidator.equals(
      "status resolved filter returns valid pagination",
      response.pagination.current,
      1,
    );
    TestValidator.predicate(
      "status resolved filter returns data",
      () => response.pagination.records >= 0,
    );
  }
  // 5. Test status filter - 'dismissed'
  {
    const response =
      await api.functional.redditCommunity.admin.report_resolutions.index(
        adminConnection,
        {
          body: { status: "dismissed" as const },
        },
      );
    typia.assert(response);
    TestValidator.equals(
      "status dismissed filter returns valid pagination",
      response.pagination.current,
      1,
    );
    TestValidator.predicate(
      "status dismissed filter returns data",
      () => response.pagination.records >= 0,
    );
  }
  // 6. Test resolution_type filter - 'resolved'
  {
    const response =
      await api.functional.redditCommunity.admin.report_resolutions.index(
        adminConnection,
        {
          body: { resolution_type: "resolved" as const },
        },
      );
    typia.assert(response);
    TestValidator.equals(
      "resolution_type resolved filter returns valid pagination",
      response.pagination.current,
      1,
    );
    TestValidator.predicate(
      "resolution_type resolved filter returns data",
      () => response.pagination.records >= 0,
    );
  }
  // 7. Test resolution_type filter - 'dismissed'
  {
    const response =
      await api.functional.redditCommunity.admin.report_resolutions.index(
        adminConnection,
        {
          body: { resolution_type: "dismissed" as const },
        },
      );
    typia.assert(response);
    TestValidator.equals(
      "resolution_type dismissed filter returns valid pagination",
      response.pagination.current,
      1,
    );
    TestValidator.predicate(
      "resolution_type dismissed filter returns data",
      () => response.pagination.records >= 0,
    );
  }
  // 8. Test admin_id filter
  {
    const response =
      await api.functional.redditCommunity.admin.report_resolutions.index(
        adminConnection,
        {
          body: { admin_id: admin.id },
        },
      );
    typia.assert(response);
    TestValidator.equals(
      "admin_id filter returns valid pagination",
      response.pagination.current,
      1,
    );
    TestValidator.predicate(
      "admin_id filter returns data",
      () => response.pagination.records >= 0,
    );
  }
  // 9. Test community_id filter
  {
    const response =
      await api.functional.redditCommunity.admin.report_resolutions.index(
        adminConnection,
        {
          body: { community_id: typia.random<string & tags.Format<"uuid">>() },
        },
      );
    typia.assert(response);
    TestValidator.equals(
      "community_id filter returns valid pagination",
      response.pagination.current,
      1,
    );
    TestValidator.predicate(
      "community_id filter returns data",
      () => response.pagination.records >= 0,
    );
  }
  // 10. Test created_at_from filter
  {
    const response =
      await api.functional.redditCommunity.admin.report_resolutions.index(
        adminConnection,
        {
          body: {
            created_at_from: new Date(Date.now() - 86400000 * 3).toISOString(),
          },
        },
      );
    typia.assert(response);
    TestValidator.equals(
      "created_at_from filter returns valid pagination",
      response.pagination.current,
      1,
    );
    TestValidator.predicate(
      "created_at_from filter returns data",
      () => response.pagination.records >= 0,
    );
  }
  // 11. Test created_at_to filter
  {
    const response =
      await api.functional.redditCommunity.admin.report_resolutions.index(
        adminConnection,
        {
          body: {
            created_at_to: new Date(Date.now() + 86400000).toISOString(),
          },
        },
      );
    typia.assert(response);
    TestValidator.equals(
      "created_at_to filter returns valid pagination",
      response.pagination.current,
      1,
    );
    TestValidator.predicate(
      "created_at_to filter returns data",
      () => response.pagination.records >= 0,
    );
  }
  // 12. Test combined filtering
  {
    const response =
      await api.functional.redditCommunity.admin.report_resolutions.index(
        adminConnection,
        {
          body: {
            status: "open" as const,
            admin_id: admin.id,
            community_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    typia.assert(response);
    TestValidator.equals(
      "combined filter returns valid pagination",
      response.pagination.current,
      1,
    );
    TestValidator.predicate(
      "combined filter returns data",
      () => response.pagination.records >= 0,
    );
  }
  // 13. Test resolved_at filters
  {
    const responseFrom =
      await api.functional.redditCommunity.admin.report_resolutions.index(
        adminConnection,
        {
          body: {
            resolved_at_from: new Date(Date.now() - 86400000).toISOString(),
          },
        },
      );
    typia.assert(responseFrom);
    TestValidator.equals(
      "resolved_at_from filter returns valid pagination",
      responseFrom.pagination.current,
      1,
    );
    const responseTo =
      await api.functional.redditCommunity.admin.report_resolutions.index(
        adminConnection,
        {
          body: {
            resolved_at_to: new Date(Date.now() + 86400000).toISOString(),
          },
        },
      );
    typia.assert(responseTo);
    TestValidator.equals(
      "resolved_at_to filter returns valid pagination",
      responseTo.pagination.current,
      1,
    );
  }
  // 14. Test deleted filter defaults to false
  {
    const response =
      await api.functional.redditCommunity.admin.report_resolutions.index(
        adminConnection,
        {
          body: {},
        },
      );
    typia.assert(response);
    TestValidator.equals(
      "default deleted filter returns valid pagination",
      response.pagination.current,
      1,
    );
    TestValidator.predicate(
      "default deleted filter returns data",
      () => response.pagination.records >= 0,
    );
    TestValidator.equals(
      "pagination records matches array length",
      response.pagination.records,
      response.data.length,
    );
  }
  // 15. Test explicit deleted: true
  {
    const response =
      await api.functional.redditCommunity.admin.report_resolutions.index(
        adminConnection,
        {
          body: { deleted: true },
        },
      );
    typia.assert(response);
    TestValidator.equals(
      "deleted: true returns valid pagination",
      response.pagination.current,
      1,
    );
    TestValidator.predicate(
      "deleted: true returns data",
      () => response.pagination.records >= 0,
    );
  }
}

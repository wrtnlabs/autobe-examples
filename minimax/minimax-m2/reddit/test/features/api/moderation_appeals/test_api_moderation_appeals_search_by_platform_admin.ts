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

export async function test_api_moderation_appeals_search_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate as platform administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12) + "123!";

  const admin: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        administrator_level: "admin",
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

  // 2. Test basic search with default parameters
  const basicSearch =
    await api.functional.redditPlatform.platformAdministrator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(basicSearch);

  TestValidator.equals(
    "basic search returns pagination data",
    basicSearch.data !== undefined,
    true,
  );
  TestValidator.equals(
    "basic search has pagination info",
    basicSearch.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "basic search has current page",
    basicSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "basic search has limit applied",
    basicSearch.pagination.limit,
    20,
  );

  // 3. Test status filtering
  const statusFilters = [
    "pending",
    "under_review",
    "approved",
    "denied",
    "withdrawn",
    "escalated",
  ];
  for (const status of statusFilters) {
    const statusSearch =
      await api.functional.redditPlatform.platformAdministrator.appeals.index(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
            status: status,
            order_by: "created_at",
            order_direction: "desc",
          } satisfies IRedditPlatformModerationAppeal.IRequest,
        },
      );
    typia.assert(statusSearch);

    TestValidator.equals(
      `status filter ${status} returns data`,
      statusSearch.data !== undefined,
      true,
    );
    TestValidator.equals(
      `status filter ${status} has pagination`,
      statusSearch.pagination !== undefined,
      true,
    );
  }

  // 4. Test appeal level filtering
  const appealLevels = ["initial", "secondary", "final"];
  for (const level of appealLevels) {
    const levelSearch =
      await api.functional.redditPlatform.platformAdministrator.appeals.index(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
            appeal_level: level,
            order_by: "created_at",
            order_direction: "desc",
          } satisfies IRedditPlatformModerationAppeal.IRequest,
        },
      );
    typia.assert(levelSearch);

    TestValidator.equals(
      `appeal level filter ${level} returns data`,
      levelSearch.data !== undefined,
      true,
    );
  }

  // 5. Test date range filtering
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const dateRangeSearch =
    await api.functional.redditPlatform.platformAdministrator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          created_at_from: weekAgo.toISOString(),
          created_at_to: now.toISOString(),
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(dateRangeSearch);

  TestValidator.equals(
    "date range search returns data",
    dateRangeSearch.data !== undefined,
    true,
  );

  // 6. Test pagination with different page sizes
  const pageSizes = [5, 10, 25, 50, 100];
  for (const pageSize of pageSizes) {
    const paginationSearch =
      await api.functional.redditPlatform.platformAdministrator.appeals.index(
        connection,
        {
          body: {
            page: 1,
            limit: pageSize,
            order_by: "created_at",
            order_direction: "desc",
          } satisfies IRedditPlatformModerationAppeal.IRequest,
        },
      );
    typia.assert(paginationSearch);

    TestValidator.equals(
      `page size ${pageSize} applied correctly`,
      paginationSearch.pagination.limit,
      pageSize,
    );
    TestValidator.equals(
      `page size ${pageSize} returns data`,
      paginationSearch.data !== undefined,
      true,
    );
  }

  // 7. Test pagination (multiple pages)
  const firstPage =
    await api.functional.redditPlatform.platformAdministrator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(firstPage);

  const secondPage =
    await api.functional.redditPlatform.platformAdministrator.appeals.index(
      connection,
      {
        body: {
          page: 2,
          limit: 5,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(secondPage);

  TestValidator.equals(
    "first page returns data",
    firstPage.data.length > 0,
    true,
  );
  TestValidator.equals(
    "second page returns data",
    secondPage.data !== undefined,
    true,
  );

  // 8. Test sorting by different fields
  const sortFields = [
    "created_at",
    "updated_at",
    "resolved_at",
    "appeal_level",
  ] as const;
  for (const sortField of sortFields) {
    const sortSearch =
      await api.functional.redditPlatform.platformAdministrator.appeals.index(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
            order_by: sortField,
            order_direction: "desc",
          } satisfies IRedditPlatformModerationAppeal.IRequest,
        },
      );
    typia.assert(sortSearch);

    TestValidator.equals(
      `sort by ${sortField} descending returns data`,
      sortSearch.data !== undefined,
      true,
    );
  }

  // 9. Test sorting directions (asc and desc)
  for (const sortField of sortFields) {
    const ascSearch =
      await api.functional.redditPlatform.platformAdministrator.appeals.index(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
            order_by: sortField,
            order_direction: "asc",
          } satisfies IRedditPlatformModerationAppeal.IRequest,
        },
      );
    typia.assert(ascSearch);

    TestValidator.equals(
      `sort by ${sortField} ascending returns data`,
      ascSearch.data !== undefined,
      true,
    );
  }

  // 10. Test complex query combinations
  const complexSearch =
    await api.functional.redditPlatform.platformAdministrator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          status: "pending",
          appeal_level: "initial",
          created_at_from: weekAgo.toISOString(),
          created_at_to: now.toISOString(),
          order_by: "updated_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(complexSearch);

  TestValidator.equals(
    "complex query returns data",
    complexSearch.data !== undefined,
    true,
  );
  TestValidator.equals(
    "complex query has correct pagination",
    complexSearch.pagination !== undefined,
    true,
  );

  // 11. Test resolved date filtering
  const resolvedDateSearch =
    await api.functional.redditPlatform.platformAdministrator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          resolved_at_from: yesterday.toISOString(),
          resolved_at_to: now.toISOString(),
          order_by: "resolved_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(resolvedDateSearch);

  TestValidator.equals(
    "resolved date filtering returns data",
    resolvedDateSearch.data !== undefined,
    true,
  );

  // 12. Test pagination record count accuracy
  const fullSearch =
    await api.functional.redditPlatform.platformAdministrator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(fullSearch);

  TestValidator.equals(
    "pagination record count available",
    fullSearch.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages calculated correctly",
    Math.ceil(fullSearch.pagination.records / fullSearch.pagination.limit) ===
      fullSearch.pagination.pages,
    true,
  );

  // 13. Test filtering by escalation status
  const escalatedSearch =
    await api.functional.redditPlatform.platformAdministrator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          is_escalated: true,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(escalatedSearch);

  TestValidator.equals(
    "escalated appeals filter returns data",
    escalatedSearch.data !== undefined,
    true,
  );

  // 14. Test non-escalated filter
  const nonEscalatedSearch =
    await api.functional.redditPlatform.platformAdministrator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          is_escalated: false,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(nonEscalatedSearch);

  TestValidator.equals(
    "non-escalated appeals filter returns data",
    nonEscalatedSearch.data !== undefined,
    true,
  );
}

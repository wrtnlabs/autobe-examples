import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSystemNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_system_notifications_search_text_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Generate test notifications with varied content and dates
  const notifications = ArrayUtil.repeat(10, (index) => {
    const baseDate = new Date("2024-01-01T00:00:00Z");
    const createdAt = new Date(
      baseDate.getTime() + index * 24 * 60 * 60 * 1000,
    ).toISOString();
    return {
      notification_type: RandomGenerator.pick([
        "alert",
        "warning",
        "info",
        "success",
      ] as const),
      priority: RandomGenerator.pick([
        "low",
        "normal",
        "high",
        "urgent",
      ] as const),
      status: "completed",
      is_broadcast: index % 3 === 0,
      title: RandomGenerator.pick([
        "System maintenance scheduled for next week",
        "Security update required for user accounts",
        "New feature released: enhanced search functionality",
        "Performance optimization completed successfully",
        "Database backup process initiated",
        "User authentication system upgraded",
        "API rate limits adjusted for better performance",
        "Notification system improvements deployed",
        "Bug fixes applied to reporting module",
        "Community platform enhancements released",
      ] as const),
      created_at: createdAt,
    };
  });
  // Perform text search with date range filtering
  const searchRequest: ICommunityPlatformSystemNotification.IRequest = {
    search: "system maintenance",
    created_at_from: "2024-01-01T00:00:00Z",
    created_at_to: "2024-01-10T23:59:59Z",
    page: 1,
    limit: 10,
  };
  const searchResults =
    await api.functional.communityPlatform.admin.system_notifications.index(
      adminConnection,
      { body: searchRequest },
    );
  typia.assert(searchResults);
  // Validate search results
  TestValidator.predicate(
    "search results should contain data",
    searchResults.data.length > 0,
  );
  TestValidator.equals(
    "pagination should be valid",
    searchResults.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit should be respected",
    searchResults.pagination.limit <= 10,
  );
  // Test pagination with filtered results
  const paginationRequest: ICommunityPlatformSystemNotification.IRequest = {
    search: "system",
    created_at_from: "2024-01-01T00:00:00Z",
    created_at_to: "2024-01-15T23:59:59Z",
    page: 1,
    limit: 5,
  };
  const paginatedResults =
    await api.functional.communityPlatform.admin.system_notifications.index(
      adminConnection,
      { body: paginationRequest },
    );
  typia.assert(paginatedResults);
  TestValidator.predicate(
    "paginated results should be limited",
    paginatedResults.data.length <= 5,
  );
  TestValidator.predicate(
    "total records should be valid",
    paginatedResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be calculated",
    paginatedResults.pagination.pages >= 1,
  );
}

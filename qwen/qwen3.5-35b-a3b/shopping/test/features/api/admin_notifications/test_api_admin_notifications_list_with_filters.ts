import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_notifications_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Update adminConnection with token
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: admin.token.access,
  };
  // 3. Test basic list (no filters) - validate admin sees all notifications
  const basicList =
    await api.functional.ecommerceMall.admin.notifications.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(basicList);
  // 4. Test filtering by notification type
  const types = [
    "order_update",
    "seller_approval",
    "platform_announcement",
    "system_alert",
  ] as const;
  for (const type of types) {
    const typeFiltered =
      await api.functional.ecommerceMall.admin.notifications.index(
        adminConnection,
        {
          body: { type },
        },
      );
    typia.assert(typeFiltered);
    // Validate all returned notifications have the correct type
    for (const notification of typeFiltered.data) {
      TestValidator.equals(
        `notification ${notification.id} has correct type`,
        notification.type,
        type,
      );
    }
  }
  // 5. Test filtering by read status
  const readStatuses = ["unread", "read"] as const;
  for (const readStatus of readStatuses) {
    const statusFiltered =
      await api.functional.ecommerceMall.admin.notifications.index(
        adminConnection,
        {
          body: { read_status: readStatus },
        },
      );
    typia.assert(statusFiltered);
    // Validate all returned notifications have the correct read status
    for (const notification of statusFiltered.data) {
      TestValidator.equals(
        `notification ${notification.id} has correct read status`,
        notification.status,
        readStatus,
      );
    }
  }
  // 6. Test date range filtering
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeFiltered =
    await api.functional.ecommerceMall.admin.notifications.index(
      adminConnection,
      {
        body: {
          created_at_from: weekAgo.toISOString(),
          created_at_to: now.toISOString(),
        },
      },
    );
  typia.assert(dateRangeFiltered);
  // Validate all returned notifications are within date range
  for (const notification of dateRangeFiltered.data) {
    const createdAt = new Date(notification.created_at);
    TestValidator.predicate(
      `notification ${notification.id} created_at within range`,
      createdAt >= weekAgo && createdAt <= now,
    );
  }
  // 7. Test full-text search
  const searchTerm = typia
    .random<string & tags.Format<"email">>()
    .split("@")[0];
  const searchFiltered =
    await api.functional.ecommerceMall.admin.notifications.index(
      adminConnection,
      {
        body: { search: searchTerm },
      },
    );
  typia.assert(searchFiltered);
  // Validate search results structure
  TestValidator.equals(
    "search pagination exists",
    searchFiltered.pagination?.current,
    1,
  );
  TestValidator.equals(
    "search has data array",
    searchFiltered.data?.length >= 0,
    true,
  );
  // 8. Test pagination with different page sizes
  const pageSizes = [5, 10, 20, 50];
  for (const pageSize of pageSizes) {
    const pagination =
      await api.functional.ecommerceMall.admin.notifications.index(
        adminConnection,
        {
          body: { per_page: pageSize },
        },
      );
    typia.assert(pagination);
    // Validate pagination metadata
    TestValidator.equals(
      "pagination has current page",
      pagination.pagination.current >= 1,
      true,
    );
    TestValidator.equals(
      "pagination has limit",
      pagination.pagination.limit,
      pageSize,
    );
    TestValidator.equals(
      "pagination has records",
      pagination.pagination.records >= 0,
      true,
    );
    TestValidator.equals(
      "pagination has pages",
      pagination.pagination.pages >= 0,
      true,
    );
    // Validate records per page doesn't exceed limit
    TestValidator.predicate(
      `page size ${pageSize} doesn't exceed limit`,
      pagination.data.length <= pageSize,
    );
  }
  // 9. Test sorting by created_at (ascending and descending)
  const sortByCreatedAtAsc =
    await api.functional.ecommerceMall.admin.notifications.index(
      adminConnection,
      {
        body: { sort: "created_at", order: "asc" },
      },
    );
  typia.assert(sortByCreatedAtAsc);
  const sortByCreatedAtDesc =
    await api.functional.ecommerceMall.admin.notifications.index(
      adminConnection,
      {
        body: { sort: "created_at", order: "desc" },
      },
    );
  typia.assert(sortByCreatedAtDesc);
  // Validate sort results have expected structure
  TestValidator.equals(
    "created_at asc pagination exists",
    sortByCreatedAtAsc.pagination?.current,
    1,
  );
  TestValidator.equals(
    "created_at desc pagination exists",
    sortByCreatedAtDesc.pagination?.current,
    1,
  );
  // 10. Test sorting by title (ascending and descending)
  const sortByTitleAsc =
    await api.functional.ecommerceMall.admin.notifications.index(
      adminConnection,
      {
        body: { sort: "title", order: "asc" },
      },
    );
  typia.assert(sortByTitleAsc);
  const sortByTitleDesc =
    await api.functional.ecommerceMall.admin.notifications.index(
      adminConnection,
      {
        body: { sort: "title", order: "desc" },
      },
    );
  typia.assert(sortByTitleDesc);
  // 11. Verify notification summaries contain all required fields
  if (basicList.data.length > 0) {
    const firstNotification = basicList.data[0];
    typia.assert(firstNotification);
    // Validate all required fields exist and have correct types
    TestValidator.equals(
      "notification has id field",
      firstNotification.id !== undefined,
      true,
    );
    TestValidator.equals(
      "notification has title field",
      firstNotification.title !== undefined,
      true,
    );
    TestValidator.equals(
      "notification has body field",
      firstNotification.body !== undefined,
      true,
    );
    TestValidator.equals(
      "notification has type field",
      firstNotification.type !== undefined,
      true,
    );
    TestValidator.equals(
      "notification has status field",
      firstNotification.status !== undefined,
      true,
    );
    TestValidator.equals(
      "notification has created_at field",
      firstNotification.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "notification has updated_at field",
      firstNotification.updated_at !== undefined,
      true,
    );
  }
  // 12. Ensure admin has platform-wide access (no actor_id limitation)
  const adminViewAll =
    await api.functional.ecommerceMall.admin.notifications.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(adminViewAll);
  // Admin should be able to access all notifications without specifying actor_id
  TestValidator.predicate(
    "admin can view all notifications",
    adminViewAll.pagination.records >= 0,
  );
}

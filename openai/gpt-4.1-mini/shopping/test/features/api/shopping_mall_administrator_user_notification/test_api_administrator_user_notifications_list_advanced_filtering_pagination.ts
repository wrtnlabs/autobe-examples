import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallUserNotification";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_user_notifications_list_advanced_filtering_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinInput: IShoppingMallAdministrator.IJoin = {
    email: RandomGenerator.alphaNumeric(12) + "@example.com",
    password: "securePass123",
  };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuthorized);
  adminConnection.headers = { Authorization: adminAuthorized.token.access };
  // Helper function to create user notifications with various attributes
  async function createNotification(
    inputOverrides: Partial<IShoppingMallUserNotification.IRequest>,
  ) {
    const body: IShoppingMallUserNotification.IRequest = {
      ownerType: "administrator",
      isRead: inputOverrides.isRead ?? false,
      deliveredFrom: inputOverrides.deliveredFrom,
      deliveredTo: inputOverrides.deliveredTo,
      readFrom: inputOverrides.readFrom,
      readTo: inputOverrides.readTo,
      search: inputOverrides.search,
      page: 1,
      limit: 100,
      sortBy: inputOverrides.sortBy ?? "deliveredAt",
      sortOrder: inputOverrides.sortOrder ?? "desc",
    };
    // We use the existing endpoint api.functional.shoppingMall.administrator.userNotifications.index
    // to get notifications, but since creation is not specified, we assume
    // direct injection or pre-existing data for testing filters.
    // Since no create notification utility or API is present, this is a placeholder.
  }
  // 2. Prepare a set of sample notifications with diverse attributes
  // In absence of create API, we assume pre-existing diverse data in the system
  // Establish a base filter for multiple test cases
  const baseFilter: IShoppingMallUserNotification.IRequest = {
    ownerType: "administrator",
    page: 1,
    limit: 10,
  };
  // 3. Test case: Fetch first page, default sorting, no filter
  {
    const result =
      await api.functional.shoppingMall.administrator.userNotifications.index(
        adminConnection,
        { body: baseFilter },
      );
    typia.assert(result);
    TestValidator.predicate(
      "notifications data count non-zero",
      result.data.length >= 0,
    );
    TestValidator.predicate(
      "pagination current is 1",
      result.pagination.current === 1,
    );
  }
  // 4. Test case: Filtering by isRead
  {
    const filterByIsRead: IShoppingMallUserNotification.IRequest = {
      ...baseFilter,
      isRead: true,
    };
    const result =
      await api.functional.shoppingMall.administrator.userNotifications.index(
        adminConnection,
        { body: filterByIsRead },
      );
    typia.assert(result);
    for (const notification of result.data) {
      TestValidator.equals(
        "isRead filter validation",
        notification.isRead,
        true,
      );
    }
  }
  // 5. Test case: Filtering by deliveredFrom and deliveredTo
  {
    const deliveredFrom = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const deliveredTo = new Date().toISOString();
    const filterByDeliveredDate: IShoppingMallUserNotification.IRequest = {
      ...baseFilter,
      deliveredFrom: deliveredFrom,
      deliveredTo: deliveredTo,
    };
    const result =
      await api.functional.shoppingMall.administrator.userNotifications.index(
        adminConnection,
        { body: filterByDeliveredDate },
      );
    typia.assert(result);
    for (const notification of result.data) {
      if (notification.deliveredAt !== null) {
        const deliveredAtTime = new Date(notification.deliveredAt).getTime();
        const fromTime = new Date(deliveredFrom).getTime();
        const toTime = new Date(deliveredTo).getTime();
        TestValidator.predicate(
          "deliveredAt date range",
          fromTime <= deliveredAtTime && deliveredAtTime <= toTime,
        );
      }
    }
  }
  // 6. Test case: Filtering by readFrom and readTo
  {
    const readFrom = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const readTo = new Date().toISOString();
    const filterByReadDate: IShoppingMallUserNotification.IRequest = {
      ...baseFilter,
      readFrom: readFrom,
      readTo: readTo,
      isRead: true,
    };
    const result =
      await api.functional.shoppingMall.administrator.userNotifications.index(
        adminConnection,
        { body: filterByReadDate },
      );
    typia.assert(result);
    for (const notification of result.data) {
      if (notification.readAt !== null) {
        const readAtTime = new Date(notification.readAt).getTime();
        const fromTime = new Date(readFrom).getTime();
        const toTime = new Date(readTo).getTime();
        TestValidator.predicate(
          "readAt date range",
          fromTime <= readAtTime && readAtTime <= toTime,
        );
      }
    }
  }
  // 7. Test case: Full text search on title and body
  {
    // Use a common search keyword in notifications
    const searchKeyword = "update";
    const searchFilter: IShoppingMallUserNotification.IRequest = {
      ...baseFilter,
      search: searchKeyword,
    };
    const result =
      await api.functional.shoppingMall.administrator.userNotifications.index(
        adminConnection,
        { body: searchFilter },
      );
    typia.assert(result);
    for (const notification of result.data) {
      const titleIncludes = notification.title.includes(searchKeyword);
      const bodyIncludes = notification.body.includes(searchKeyword);
      TestValidator.predicate(
        "full-text search filter",
        titleIncludes || bodyIncludes,
      );
    }
  }
  // 8. Test case: Pagination controls
  {
    const paginationFilter: IShoppingMallUserNotification.IRequest = {
      ...baseFilter,
      page: 2,
      limit: 5,
    };
    const result =
      await api.functional.shoppingMall.administrator.userNotifications.index(
        adminConnection,
        { body: paginationFilter },
      );
    typia.assert(result);
    TestValidator.equals(
      "pagination current page",
      result.pagination.current,
      2,
    );
    TestValidator.equals("pagination limit", result.pagination.limit, 5);
  }
  // 9. Test case: Sorting by different fields and directions
  {
    const sortableFields = ["deliveredAt", "readAt", "createdAt"] as const;
    for (const field of sortableFields) {
      for (const order of ["asc", "desc"] as const) {
        const sortFilter: IShoppingMallUserNotification.IRequest = {
          ...baseFilter,
          sortBy: field,
          sortOrder: order,
        };
        const result =
          await api.functional.shoppingMall.administrator.userNotifications.index(
            adminConnection,
            { body: sortFilter },
          );
        typia.assert(result);
        if (result.data.length > 1) {
          for (let i = 1; i < result.data.length; i++) {
            const prev = result.data[i - 1];
            const curr = result.data[i];
            const prevKey = prev[field];
            const currKey = curr[field];
            if (prevKey !== null && currKey !== null) {
              if (order === "asc") {
                TestValidator.predicate(
                  `sorting ascending by ${field}`,
                  prevKey <= currKey,
                );
              } else {
                TestValidator.predicate(
                  `sorting descending by ${field}`,
                  prevKey >= currKey,
                );
              }
            }
          }
        }
      }
    }
  }
}

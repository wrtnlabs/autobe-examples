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

export async function test_api_administrator_user_notifications_list_basic_filtering(
  connection: api.IConnection,
) {
  // Setup administrator account and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  adminConnection.headers = { Authorization: adminAuth.token.access };
  // Define possible owner types and isRead values for testing
  const ownerTypes = ["customer", "seller", "administrator"] as const;
  const isReads = [true, false];
  // For each ownerType and isRead value, test the notification list retrieval
  for (const ownerType of ownerTypes) {
    for (const isRead of isReads) {
      const requestBody: IShoppingMallUserNotification.IRequest = {
        ownerType: ownerType,
        isRead: isRead,
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
      };
      const output =
        await api.functional.shoppingMall.administrator.userNotifications.index(
          adminConnection,
          { body: requestBody },
        );
      typia.assert(output);
      // Validate pagination
      TestValidator.predicate(
        "pagination current page is 1",
        output.pagination.current === 1,
      );
      TestValidator.predicate(
        "pagination limit is 10",
        output.pagination.limit === 10,
      );
      TestValidator.predicate(
        "pagination records count >= data length",
        output.pagination.records >= output.data.length,
      );
      TestValidator.predicate(
        "pagination pages is non-negative",
        output.pagination.pages >= 0,
      );
      // Validate each notification
      for (const notification of output.data) {
        typia.assert(notification);
        TestValidator.equals(
          "notification ownerType matches",
          notification.ownerType,
          ownerType,
        );
        TestValidator.equals(
          "notification isRead flag matches",
          notification.isRead,
          isRead,
        );
      }
    }
  }
}

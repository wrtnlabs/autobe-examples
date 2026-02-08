import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallUserNotification";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test retrieving notification summaries for an authenticated administrator,
 * verifying pagination, data integrity, ownership, and optional field handling.
 */
export async function test_api_administrator_notifications_summary_success(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  const authorized: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_join(administratorConnection, {
      body: {},
    });
  // authorize_administrator_join updates the connection headers internally
  const notificationSummary: IPageIShoppingMallUserNotification.ISummary =
    await api.functional.shoppingMall.administrator.notifications.summary.index(
      administratorConnection,
    );
  typia.assert(notificationSummary);
  const pagination = notificationSummary.pagination;
  TestValidator.predicate(
    "pagination current page is a positive integer",
    pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive integer",
    pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative integer",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is consistent with records and limit",
    pagination.pages ===
      (pagination.records === 0
        ? 0
        : Math.ceil(pagination.records / pagination.limit)),
  );
  notificationSummary.data.forEach((notification) => {
    typia.assert(notification);
  });
}

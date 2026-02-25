import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationDelivery";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationDelivery";
import type { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";
import type { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_notification_delivery_filtering_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {});
  // adminConnection.headers updated internally
  // 2. Prepare date range filters
  const now = new Date();
  const days = 10;
  // Calculate ISO strings for date range
  const attemptedAtFrom = new Date(
    now.getTime() - days * 24 * 60 * 60 * 1000,
  ).toISOString();
  const attemptedAtTo = now.toISOString();
  // 3. Query with both from and to - should only receive records inside range
  const filteredOutput =
    await api.functional.shoppingMall.administrator.notificationDeliveries.index(
      adminConnection,
      {
        body: {
          attemptedAtFrom,
          attemptedAtTo,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallNotificationDelivery.IRequest,
      },
    );
  typia.assert(filteredOutput);
  // 4. Validate all returned records have attemptedAt between from and to
  for (const delivery of filteredOutput.data) {
    const attemptedDate = new Date(delivery.attemptedAt);
    TestValidator.predicate(
      `attemptedAt >= attemptedAtFrom for delivery ${delivery.id}`,
      attemptedDate >= new Date(attemptedAtFrom),
    );
    TestValidator.predicate(
      `attemptedAt <= attemptedAtTo for delivery ${delivery.id}`,
      attemptedDate <= new Date(attemptedAtTo),
    );
  }
  // 5. Query with from only
  const fromOnlyOutput =
    await api.functional.shoppingMall.administrator.notificationDeliveries.index(
      adminConnection,
      {
        body: {
          attemptedAtFrom,
          attemptedAtTo: null,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallNotificationDelivery.IRequest,
      },
    );
  typia.assert(fromOnlyOutput);
  for (const delivery of fromOnlyOutput.data) {
    const attemptedDate = new Date(delivery.attemptedAt);
    TestValidator.predicate(
      `attemptedAt >= attemptedAtFrom for delivery ${delivery.id}`,
      attemptedDate >= new Date(attemptedAtFrom),
    );
  }
  // 6. Query with to only
  const toOnlyOutput =
    await api.functional.shoppingMall.administrator.notificationDeliveries.index(
      adminConnection,
      {
        body: {
          attemptedAtFrom: null,
          attemptedAtTo,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallNotificationDelivery.IRequest,
      },
    );
  typia.assert(toOnlyOutput);
  for (const delivery of toOnlyOutput.data) {
    const attemptedDate = new Date(delivery.attemptedAt);
    TestValidator.predicate(
      `attemptedAt <= attemptedAtTo for delivery ${delivery.id}`,
      attemptedDate <= new Date(attemptedAtTo),
    );
  }
  // 7. Query with neither from nor to (empty filters) to check full list and pagination
  const emptyFilterOutput =
    await api.functional.shoppingMall.administrator.notificationDeliveries.index(
      adminConnection,
      {
        body: {
          attemptedAtFrom: null,
          attemptedAtTo: null,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallNotificationDelivery.IRequest,
      },
    );
  typia.assert(emptyFilterOutput);
  // 8. Validate pagination is consistent
  TestValidator.predicate(
    "pagination current is 1",
    emptyFilterOutput.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 20",
    emptyFilterOutput.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    emptyFilterOutput.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records >= data length",
    emptyFilterOutput.pagination.records >= emptyFilterOutput.data.length,
  );
  // 9. Validate default sorting by attemptedAt descending (secondary validation)
  for (let i = 1; i < emptyFilterOutput.data.length; i++) {
    const prev = new Date(emptyFilterOutput.data[i - 1].attemptedAt);
    const curr = new Date(emptyFilterOutput.data[i].attemptedAt);
    TestValidator.predicate(
      `sorted by attemptedAt descending at index ${i - 1} and ${i}`,
      prev >= curr,
    );
  }
}

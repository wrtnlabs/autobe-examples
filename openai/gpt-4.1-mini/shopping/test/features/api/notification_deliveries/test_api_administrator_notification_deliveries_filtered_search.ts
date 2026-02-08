import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationDelivery";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationDelivery";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_notification_deliveries_filtered_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${adminAuthorized.token.access}`;
  // 2. Call the notificationDeliveries.index with channel and status filter
  // The request body type IShoppingMallNotificationDelivery.IRequest has no detailed props,
  // So using only channel, status, and pagination fields as scenario suggests
  const filterBodyBase = {
    channel: "email",
    status: "delivered",
    limit: 10,
    current: 1,
  } satisfies IShoppingMallNotificationDelivery.IRequest;
  // 3. First API call - filter by channel and status
  const result1 =
    await api.functional.shoppingMall.administrator.notificationDeliveries.index(
      adminConnection,
      { body: filterBodyBase },
    );
  typia.assert(result1);
  // To fix type errors, we cast data as array of objects having needed properties
  type DeliveryItem = {
    channel: string;
    status: string;
    attemptedAt: string;
    shoppingMallNotificationTemplateId: string | null;
    shoppingMallUserNotificationId: string | null;
  };
  const data1 = result1.data as DeliveryItem[];

  // Validate each delivery matches filter
  for (const delivery of data1) {
    TestValidator.equals("channel filter", delivery.channel, "email");
    TestValidator.equals("status filter", delivery.status, "delivered");
  }
  // Validate pagination
  TestValidator.predicate(
    "pagination current",
    result1.pagination.current === 1,
  );
  TestValidator.predicate("pagination limit", result1.pagination.limit === 10);
  TestValidator.predicate(
    "pagination records non-negative",
    result1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    result1.pagination.pages >= 0,
  );
  // Validate sorting by attemptedAt descending
  for (let i = 1; i < data1.length; i++) {
    const prev = new Date(data1[i - 1].attemptedAt).getTime();
    const curr = new Date(data1[i].attemptedAt).getTime();
    TestValidator.predicate(
      `sorted attemptedAt desc at index ${i - 1}`,
      prev >= curr,
    );
  }
  // 4. Second API call - include notification template id and user notification id to filter
  const firstDelivery = data1[0];
  if (firstDelivery !== undefined) {
    const filterBody2 = {
      ...filterBodyBase,
      shoppingMallNotificationTemplateId: firstDelivery.shoppingMallNotificationTemplateId,
      shoppingMallUserNotificationId: firstDelivery.shoppingMallUserNotificationId,
    } satisfies IShoppingMallNotificationDelivery.IRequest;
    const result2 =
      await api.functional.shoppingMall.administrator.notificationDeliveries.index(
        adminConnection,
        { body: filterBody2 },
      );
    typia.assert(result2);
    const data2 = result2.data as DeliveryItem[];
    for (const delivery of data2) {
      TestValidator.equals(
        "notification template id filter",
        delivery.shoppingMallNotificationTemplateId,
        firstDelivery.shoppingMallNotificationTemplateId,
      );
      TestValidator.equals(
        "user notification id filter",
        delivery.shoppingMallUserNotificationId,
        firstDelivery.shoppingMallUserNotificationId,
      );
    }
  }
  // 5. Check that no soft-deleted records (deletedAt) are returned if such a field exists
  // Since deletedAt is not in ISummary explicitly, skip this check
}

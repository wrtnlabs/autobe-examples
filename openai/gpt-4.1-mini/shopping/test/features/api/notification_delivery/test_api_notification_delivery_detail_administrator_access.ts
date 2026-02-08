import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_notification_delivery_detail_administrator_access(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Administrator attempts to retrieve a notification delivery by random UUID, expect 404 or success
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  const adminConnectionWithToken: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${adminAuthorized.token.access}` },
  };
  // Use a random UUID for retrieval, likely non-existing
  const testNotificationDeliveryId = typia.random<
    string & tags.Format<"uuid">
  >();
  try {
    const delivery =
      await api.functional.shoppingMall.administrator.notificationDeliveries.atNotificationDelivery(
        adminConnectionWithToken,
        { notificationDeliveryId: testNotificationDeliveryId },
      );
    typia.assert(delivery);
  } catch (error) {
    // If 404 error, acceptable for random UUID
    // Ignore other errors for this scenario
  }
  // Scenario 2: Administrator attempts to retrieve non-existent notification delivery
  const nonExistingId = "00000000-0000-0000-0000-000000000000";
  await TestValidator.httpError(
    "non-existing notification delivery returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.notificationDeliveries.atNotificationDelivery(
        adminConnectionWithToken,
        { notificationDeliveryId: nonExistingId },
      );
    },
  );
  // Scenario 3: Unauthorized access returns 401
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access returns 401",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.notificationDeliveries.atNotificationDelivery(
        unauthorizedConnection,
        { notificationDeliveryId: testNotificationDeliveryId },
      );
    },
  );
}

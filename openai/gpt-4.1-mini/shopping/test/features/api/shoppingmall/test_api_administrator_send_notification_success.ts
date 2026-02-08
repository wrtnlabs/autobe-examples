import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";

export async function test_api_administrator_send_notification_success(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IShoppingMallAdministrator.IJoin = {};
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  const notificationSendBody: IShoppingMallUserNotification.ISendRequest = {
    templateCode: "order_shipped",
    ownerId: "00000000-0000-0000-0000-000000000001",
    channel: "email",
    parameters: {
      orderId: "ORD123456789",
      shipmentDate: new Date().toISOString(),
    },
  };
  const response =
    await api.functional.shoppingMall.administrator.notifications.send.sendNotification(
      adminConnection,
      {
        body: notificationSendBody,
      },
    );
  typia.assert(response);

  // Since the response object does not have templateCode, ownerId, channel, or status properties,
  // we instead validate the response object existence and type correctness only.
  TestValidator.predicate(
    "response object is an object",
    typeof response === "object" && response !== null,
  );
}
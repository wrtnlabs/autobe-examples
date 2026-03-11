import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallNotificationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotificationQueue";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_notification_admin_retrieval_with_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Admin login
  const loginEmail = (adminConnection.headers?.["authorization"]
    ? "admin@test.com"
    : typia.random<string & tags.Format<"email">>()) satisfies string as string;
  await authorize_admin_login(adminConnection, {
    body: {
      email: loginEmail,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 3. Create a notification via shipping update operation (simulated)
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  const sellerLoginEmail = (sellerConnection.headers?.["authorization"]
    ? "seller@test.com"
    : typia.random<string & tags.Format<"email">>()) satisfies string as string;
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerLoginEmail,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 4. Admin retrieves the specific notification
  const notifications =
    await api.functional.ecommerceMall.admin.notification_queues.at(
      adminConnection,
      {
        notificationId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(notifications);
  TestValidator.equals(
    "notification has valid id",
    typeof notifications.id,
    "string",
  );
  TestValidator.predicate(
    "notification has valid status",
    ["pending", "sent", "failed", "delivered"].includes(notifications.status),
  );
  TestValidator.predicate(
    "notification has valid created_at format",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(notifications.created_at),
  );
  TestValidator.predicate(
    "notification has valid updated_at format",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(notifications.updated_at),
  );
}
import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMall";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_notifications_resend_failed_various_filters(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Resend all failed notifications without filters
  const customerConnection1: api.IConnection = { host: connection.host };
  const authorized1 = await authorize_customer_join(customerConnection1, {
    body: {} satisfies IShoppingMallCustomer.IJoin,
  });
  customerConnection1.headers ??= {};
  customerConnection1.headers.Authorization = authorized1.token.access;
  const response1 =
    await api.functional.shoppingMall.customer.notifications.resend_failed.resendFailed(
      customerConnection1,
      { body: {} satisfies IShoppingMall.IRequest },
    );
  typia.assert(response1);
  // Scenario 2: Resend failed notifications filtered by notificationTemplateId
  // Since exact format/properties of IShoppingMall.IRequest is not detailed, we construct sample filter
  const customerConnection2: api.IConnection = { host: connection.host };
  const authorized2 = await authorize_customer_join(customerConnection2, {
    body: {} satisfies IShoppingMallCustomer.IJoin,
  });
  customerConnection2.headers ??= {};
  customerConnection2.headers.Authorization = authorized2.token.access;
  // We filter by notificationTemplateId as a string UUID, use a random UUID for demo
  const notificationTemplateId = typia.random<string & tags.Format<"uuid">>();
  const response2 =
    await api.functional.shoppingMall.customer.notifications.resend_failed.resendFailed(
      customerConnection2,
      {
        body: {
          notificationTemplateId,
        } satisfies IShoppingMall.IRequest,
      },
    );
  typia.assert(response2);
  // Scenario 3: Resend failed notifications filtered by userNotificationId
  const customerConnection3: api.IConnection = { host: connection.host };
  const authorized3 = await authorize_customer_join(customerConnection3, {
    body: {} satisfies IShoppingMallCustomer.IJoin,
  });
  customerConnection3.headers ??= {};
  customerConnection3.headers.Authorization = authorized3.token.access;
  // Use random UUID for userNotificationId
  const userNotificationId = typia.random<string & tags.Format<"uuid">>();
  const response3 =
    await api.functional.shoppingMall.customer.notifications.resend_failed.resendFailed(
      customerConnection3,
      {
        body: {
          userNotificationId,
        } satisfies IShoppingMall.IRequest,
      },
    );
  typia.assert(response3);
}

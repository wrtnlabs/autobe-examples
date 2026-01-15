import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrderEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderEvent";
import type { IShoppingMallOrderEventMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderEventMetadata";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_order_event_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 2: Generate random admin credentials for join
  const adminCredentials: IShoppingMallAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  // Step 3: Authenticate admin via join
  await authorize_admin_join(adminConnection, { body: adminCredentials });
  // Step 4: Call the endpoint with sample string values for orderCode and eventCode
  // These values are dummy but required parameters
  const orderCode: string = "ORDER-12345";
  const eventCode: string = "EVENT-67890";
  // Step 5: Retrieve the order event using the admin connection
  const event: IShoppingMallOrderEvent =
    await api.functional.shoppingMall.admin.orders.events.at(adminConnection, {
      orderCode,
      eventCode,
    });
  // Step 6: Validate the response structure and types using typia.assert
  // This performs COMPLETE type and format validation per IShoppingMallOrderEvent
  typia.assert(event);
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_order_items_cancellation_request_create } from "../../../generate/generate_random_shopping_mall_administrator_order_items_cancellation_request_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";

export async function test_api_order_item_cancellation_request_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    reason: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallCancellationRequest.ICreate;
  const first =
    await generate_random_shopping_mall_administrator_order_items_cancellation_request_create(
      adminConnection,
      {
        params: { orderItemId },
        body,
      },
    );
  typia.assert(first);
  const second =
    await generate_random_shopping_mall_administrator_order_items_cancellation_request_create(
      adminConnection,
      {
        params: { orderItemId },
        body,
      },
    );
  typia.assert(second);
  TestValidator.equals(
    "cancellation request id should remain authoritative",
    second.id,
    first.id,
  );
  TestValidator.equals(
    "order item should remain the same",
    second.orderItem.id,
    first.orderItem.id,
  );
  TestValidator.equals(
    "request reason should remain the same",
    second.reason,
    first.reason,
  );
  TestValidator.equals(
    "request status should remain the same",
    second.status,
    first.status,
  );
  TestValidator.equals(
    "request creation timestamp should remain the same",
    second.created_at,
    first.created_at,
  );
  TestValidator.equals(
    "request update timestamp should remain the same",
    second.updated_at,
    first.updated_at,
  );
  TestValidator.equals(
    "request deletion timestamp should remain the same",
    second.deleted_at,
    first.deleted_at,
  );
}

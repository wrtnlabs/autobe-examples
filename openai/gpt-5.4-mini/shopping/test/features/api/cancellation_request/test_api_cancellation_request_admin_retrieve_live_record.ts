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
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_order_items_cancellation_request_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_cancellation_request_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";

export async function test_api_cancellation_request_admin_retrieve_live_record(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const administratorConnection: api.IConnection = { host: connection.host };
  const customerJoined = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/customer-join",
      referrer: "https://example.com/",
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoined);
  const administratorJoined = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallAdministrator.IJoin,
    },
  );
  typia.assert(administratorJoined);
  const created =
    await generate_random_shopping_mall_customer_order_items_cancellation_request_create(
      customerConnection,
      {
        params: {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
        },
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallCancellationRequest.ICreate,
      },
    );
  typia.assert(created);
  const retrieved =
    await api.functional.shoppingMall.administrator.order_items.cancellation_request.at(
      administratorConnection,
      {
        orderItemId: created.orderItem.id,
      },
    );
  typia.assert(retrieved);
  TestValidator.equals("cancellation request id", retrieved.id, created.id);
  TestValidator.equals(
    "cancellation request reason",
    retrieved.reason,
    created.reason,
  );
  TestValidator.equals(
    "cancellation request status",
    retrieved.status,
    created.status,
  );
  TestValidator.equals(
    "cancellation request createdAt",
    retrieved.created_at,
    created.created_at,
  );
  TestValidator.equals(
    "cancellation request updatedAt",
    retrieved.updated_at,
    created.updated_at,
  );
  TestValidator.equals(
    "cancellation request deletedAt",
    retrieved.deleted_at,
    created.deleted_at,
  );
  TestValidator.equals(
    "linked order item id",
    retrieved.orderItem.id,
    created.orderItem.id,
  );
  TestValidator.equals(
    "linked order item quantity",
    retrieved.orderItem.quantity,
    created.orderItem.quantity,
  );
  TestValidator.equals(
    "linked order item status",
    retrieved.orderItem.status,
    created.orderItem.status,
  );
  TestValidator.equals(
    "linked order item shippedAt",
    retrieved.orderItem.shippedAt,
    created.orderItem.shippedAt,
  );
  TestValidator.equals(
    "linked order item deliveredAt",
    retrieved.orderItem.deliveredAt,
    created.orderItem.deliveredAt,
  );
  TestValidator.equals(
    "linked order item cancelledAt",
    retrieved.orderItem.cancelledAt,
    created.orderItem.cancelledAt,
  );
  TestValidator.equals(
    "linked order item refundedAt",
    retrieved.orderItem.refundedAt,
    created.orderItem.refundedAt,
  );
  TestValidator.equals(
    "linked order item createdAt",
    retrieved.orderItem.createdAt,
    created.orderItem.createdAt,
  );
  TestValidator.equals(
    "linked order item updatedAt",
    retrieved.orderItem.updatedAt,
    created.orderItem.updatedAt,
  );
  TestValidator.equals(
    "linked order item deletedAt",
    retrieved.orderItem.deletedAt,
    created.orderItem.deletedAt,
  );
}

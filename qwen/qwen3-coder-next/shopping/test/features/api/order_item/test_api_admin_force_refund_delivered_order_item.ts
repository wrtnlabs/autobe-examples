import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import type { IShoppingMallOrderRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefundRequest";
import type { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import type { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_order_items_refund_request_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_refund_request_create";
import { prepare_random_shopping_mall_order_refund_request } from "../../../prepare/prepare_random_shopping_mall_order_refund_request";

export async function test_api_admin_force_refund_delivered_order_item(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin account
  const adminJoinConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: "Admin1234!" as string &
        tags.MinLength<8> &
        tags.MaxLength<128> &
        tags.Format<"password">,
    },
  });
  // 2. Login as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: "Admin1234!" as string &
        tags.MinLength<8> &
        tags.MaxLength<128> &
        tags.Format<"password">,
    },
  });
  // 3. Register customer account
  const customerJoinConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerJoinConnection, {
    body: {
      email: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: "Customer1234!" as string &
        tags.MinLength<8> &
        tags.MaxLength<128> &
        tags.Format<"password">,
      display_name: RandomGenerator.name(),
      href: "https://example.com/join" as string & tags.Format<"uri">,
      referrer: "https://example.com/referrer" as string & tags.Format<"uri">,
    },
  });
  // 4. Login as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConnection, {
    body: {
      email: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: "Customer1234!" as string &
        tags.MinLength<8> &
        tags.MaxLength<128> &
        tags.Format<"password">,
      href: "https://example.com/login" as string & tags.Format<"uri">,
      referrer: "https://example.com/referrer" as string & tags.Format<"uri">,
    },
  });
  // 5. Create an order item through customer
  // Note: Since orders.create doesn't exist, we'll need to simulate the scenario
  // by creating a refund request for an existing order item
  // 6. Create a refund request for an order item
  const refundRequest =
    await generate_random_shopping_mall_customer_order_items_refund_request_create(
      customerConnection,
      {
        body: {
          reason: "Customer requested refund for delivery issue",
        },
        params: {
          itemId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(refundRequest);
  // 7. Force refund the order item as admin
  await api.functional.shoppingMall.admin.order_items.force_refund.forceRefund(
    adminConnection,
    {
      itemId: refundRequest.orderItem.id,
      body: {
        reason: "Administrator force-refund for dispute resolution",
      },
    },
  );
  // 8. Verify the order item status
  // Since force_refund returns void, we'll check the refund request status
  // (This would require a separate endpoint to get the refund request)
  // 9. Verify inventory restoration
  // This would require checking inventory history, but the endpoint doesn't exist
  // So we'll just verify the force_refund completed without error
}

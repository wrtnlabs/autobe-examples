import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import type { IShoppingMallOrderRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefundRequest";
import type { IShoppingMallOrderRefundRequestLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefundRequestLog";
import type { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import type { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_order_items_refund_request_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_refund_request_create";
import { prepare_random_shopping_mall_order_refund_request } from "../../../prepare/prepare_random_shopping_mall_order_refund_request";

export async function test_api_refund_request_status_logs_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create a refund request
  const refundRequest =
    await api.functional.shoppingMall.customer.order_items.refund_request.create(
      customerConnection,
      {
        itemId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          reason: "Product arrived damaged",
        } satisfies IShoppingMallOrderRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 3. Retrieve status logs for the refund request
  const statusLogs =
    await api.functional.shoppingMall.customer.refund_requests.status_logs.at(
      customerConnection,
      {
        requestId: refundRequest.id,
      },
    );
  typia.assert(statusLogs);
  // 4. Validate response structure
  TestValidator.equals("has id", typeof statusLogs.id, "string");
  TestValidator.equals("has status", typeof statusLogs.new_status, "string");
  TestValidator.equals(
    "status is valid enum value",
    ["pending", "approved", "rejected"].includes(statusLogs.new_status),
    true,
  );
  TestValidator.equals(
    "has old_status",
    typeof statusLogs.old_status,
    "string",
  );
  TestValidator.equals("has reason", typeof statusLogs.reason, "string");
  TestValidator.equals(
    "has rejection_reason",
    typeof statusLogs.rejection_reason,
    "string",
  );
  TestValidator.equals(
    "has changed_at",
    typeof statusLogs.changed_at,
    "string",
  );
  TestValidator.equals("has seller", statusLogs.seller !== null, true);
}

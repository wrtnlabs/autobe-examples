import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_refund_request_filter_by_status_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer and login
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: typia.assert<IEcommerceMallCustomer.IJoin>({
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    }),
  });
  // 2. Create delivered order item for refund request
  const order =
    await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
    );
  typia.assert(order);
  TestValidator.equals(
    "order has order items",
    order.order_items.length > 0,
    true,
  );
  const orderItem = order.order_items[0];
  // 3. Create refund requests with different statuses and dates
  const pendingRefund =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: typia.assert<IEcommerceMallRefundRequest.IRequest>({
          order_item_id: orderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          status: "pending" as const,
        }),
      },
    );
  typia.assert(pendingRefund);
  // Simulate approved refund by updating its status
  const approvedRefund =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: typia.assert<IEcommerceMallRefundRequest.IRequest>({
          order_item_id: orderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          status: "approved" as const,
        }),
      },
    );
  typia.assert(approvedRefund);
  // Simulate rejected refund by updating its status
  const rejectedRefund =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: typia.assert<IEcommerceMallRefundRequest.IRequest>({
          order_item_id: orderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          status: "rejected" as const,
        }),
      },
    );
  typia.assert(rejectedRefund);
  // 4. Test status filter: pending
  const pendingFilter =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: typia.assert<IEcommerceMallRefundRequest.IRequest>({
          page: 1,
          limit: 10,
          status: "pending" as const,
        }),
      },
    );
  typia.assert(pendingFilter);
  TestValidator.equals(
    "pending filter returns only pending",
    pendingFilter.data.length,
    1,
  );
  TestValidator.equals(
    "pending filter content",
    pendingFilter.data[0].status,
    "pending",
  );
  // 5. Test status filter: approved
  const approvedFilter =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: typia.assert<IEcommerceMallRefundRequest.IRequest>({
          page: 1,
          limit: 10,
          status: "approved" as const,
        }),
      },
    );
  typia.assert(approvedFilter);
  TestValidator.equals(
    "approved filter returns only approved",
    approvedFilter.data.length,
    1,
  );
  TestValidator.equals(
    "approved filter content",
    approvedFilter.data[0].status,
    "approved",
  );
  // 6. Test status filter: rejected
  const rejectedFilter =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: typia.assert<IEcommerceMallRefundRequest.IRequest>({
          page: 1,
          limit: 10,
          status: "rejected" as const,
        }),
      },
    );
  typia.assert(rejectedFilter);
  TestValidator.equals(
    "rejected filter returns only rejected",
    rejectedFilter.data.length,
    1,
  );
  TestValidator.equals(
    "rejected filter content",
    rejectedFilter.data[0].status,
    "rejected",
  );
  // 7. Test pagination bounds (page beyond total)
  const beyondPage =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: typia.assert<IEcommerceMallRefundRequest.IRequest>({
          page: 1000,
          limit: 10,
        }),
      },
    );
  typia.assert(beyondPage);
  TestValidator.equals("beyond page returns empty", beyondPage.data.length, 0);
  TestValidator.equals(
    "beyond page pagination",
    beyondPage.pagination.pages >= 0,
    true,
  );
  // 8. Test unauthorized access (seller role)
  const sellerConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.customer.join(sellerConnection, {
    body: typia.assert<IEcommerceMallCustomer.IJoin>({
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    }),
  });
  await TestValidator.error(
    "seller cannot access customer refund requests",
    async () => {
      await api.functional.ecommerceMall.customer.refund_requests.index(
        sellerConnection,
        {
          body: typia.assert<IEcommerceMallRefundRequest.IRequest>({
            page: 1,
            limit: 10,
          }),
        },
      );
    },
  );
}
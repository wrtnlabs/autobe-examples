import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_orders_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";

export async function test_api_order_items_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  const order = await generate_random_ecommerce_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shipping_recipient_name: RandomGenerator.name(),
        shipping_phone_number: RandomGenerator.mobile(),
        shipping_street_address: RandomGenerator.paragraph({ sentences: 2 }),
        shipping_city: RandomGenerator.name(),
        shipping_state: RandomGenerator.name(),
        shipping_postal_code: RandomGenerator.alphaNumeric(10),
        shipping_country: RandomGenerator.name(),
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  const statuses = [
    "paid",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ] as const;
  for (const status of statuses) {
    const filteredByStatus =
      await api.functional.ecommerceMall.customer.orders.items.index(
        customerConnection,
        {
          orderId: order.id,
          body: {
            status: status,
            limit: 100,
          } satisfies IEcommerceMallOrderItem.IRequest,
        },
      );
    typia.assert(filteredByStatus);
    for (const item of filteredByStatus.data) {
      TestValidator.equals(
        `all items should have status '${status}'`,
        item.status,
        status,
      );
    }
    TestValidator.equals(
      `pagination records should match data length for status '${status}'`,
      filteredByStatus.pagination.records,
      filteredByStatus.data.length,
    );
  }
  const multiStatuses = ["paid", "shipped"] as const;
  const filteredByMultiStatus =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          status:
            multiStatuses as unknown as IEcommerceMallOrderItem.IRequest["status"],
          limit: 100,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(filteredByMultiStatus);
  for (const item of filteredByMultiStatus.data) {
    const matchesStatus = multiStatuses.some((s) => s === item.status);
    TestValidator.predicate(
      `all items should have status in [${multiStatuses.join(", ")}]`,
      matchesStatus,
    );
  }
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  const oneDayFuture = new Date();
  oneDayFuture.setDate(oneDayFuture.getDate() + 1);
  const dateRangeResult =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          status: "paid",
          created_at_from: oneDayAgo.toISOString(),
          created_at_to: oneDayFuture.toISOString(),
          limit: 100,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  for (const item of dateRangeResult.data) {
    TestValidator.equals(
      "all items should have status 'paid'",
      item.status,
      "paid",
    );
    const itemDate = new Date(item.createdAt);
    TestValidator.predicate(
      "all items should be within date range",
      itemDate >= oneDayAgo && itemDate <= oneDayFuture,
    );
  }
  const sortedByStatus =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          sort_by: "status",
          sort_order: "asc",
          limit: 100,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(sortedByStatus);
  if (sortedByStatus.data.length > 1) {
    for (let i = 1; i < sortedByStatus.data.length; i++) {
      TestValidator.predicate(
        "items should be sorted by status ascending",
        sortedByStatus.data[i - 1].status <= sortedByStatus.data[i].status,
      );
    }
  }
  const emptyResult =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          status: "delivered",
          limit: 100,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty order should return zero records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty order should return empty data array",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty order should have zero pages",
    emptyResult.pagination.pages,
    0,
  );
}

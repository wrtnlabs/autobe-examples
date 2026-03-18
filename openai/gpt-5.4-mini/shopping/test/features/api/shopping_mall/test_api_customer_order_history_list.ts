import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_history_list(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = {
    ...(customerConnection.headers ?? {}),
    Authorization: `Bearer ${typia.random<string>()}`,
  };
  const request = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallOrder.IRequest;
  const output =
    await api.functional.shoppingMall.customer.orders.history.index(
      customerConnection,
      {
        body: request,
      },
    );
  typia.assert(output);
  TestValidator.predicate(
    "pagination metadata is present",
    output.pagination.current >= 0 &&
      output.pagination.limit >= 0 &&
      output.pagination.records >= 0 &&
      output.pagination.pages >= 0,
  );
  TestValidator.equals(
    "page size does not exceed requested limit",
    output.data.length <= request.limit!,
    true,
  );
  TestValidator.predicate(
    "order history summaries are newest-first when multiple records exist",
    output.data.length < 2 ||
      new Date(output.data[0].placed_at).getTime() >=
        new Date(output.data[1].placed_at).getTime(),
  );
  TestValidator.predicate(
    "order summaries expose expected history fields",
    output.data.every((order) => {
      typia.assert(order);
      return (
        typeof order.id === "string" &&
        typeof order.order_number === "string" &&
        typeof order.status === "string" &&
        typeof order.subtotal_amount === "number" &&
        typeof order.shipping_fee_amount === "number" &&
        typeof order.discount_amount === "number" &&
        typeof order.total_amount === "number" &&
        typeof order.placed_at === "string" &&
        typeof order.created_at === "string" &&
        typeof order.updated_at === "string" &&
        (order.paid_at === null || typeof order.paid_at === "string") &&
        (order.deleted_at === null || typeof order.deleted_at === "string") &&
        order.customer !== null &&
        typeof order.customer.id === "string" &&
        typeof order.customer.email === "string" &&
        typeof order.customer.accountStatus === "string"
      );
    }),
  );
}

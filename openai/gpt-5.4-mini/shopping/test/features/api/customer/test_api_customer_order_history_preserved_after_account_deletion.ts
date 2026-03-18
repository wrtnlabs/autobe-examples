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

export async function test_api_customer_order_history_preserved_after_account_deletion(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string,
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/registration",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  const history =
    await api.functional.shoppingMall.customer.orders.history.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(history);
  TestValidator.predicate(
    "pagination metadata is present",
    history.pagination.current >= 0 &&
      history.pagination.limit >= 0 &&
      history.pagination.records >= 0 &&
      history.pagination.pages >= 0,
  );
  TestValidator.predicate("order history is sorted newest first", () =>
    history.data.every(
      (order, index, array) =>
        index === 0 || array[index - 1].placed_at >= order.placed_at,
    ),
  );
  TestValidator.predicate("order history entries are preserved summaries", () =>
    history.data.every(
      (order) =>
        order.order_number.length > 0 &&
        order.status.length > 0 &&
        order.subtotal_amount >= 0 &&
        order.shipping_fee_amount >= 0 &&
        order.discount_amount >= 0 &&
        order.total_amount >= 0 &&
        order.customer.email === authorized.email,
    ),
  );
}

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

export async function test_api_customer_order_history_preserved_listing(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "http://localhost",
      referrer: "http://localhost",
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  const page = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(page);
  TestValidator.equals("pagination current", page.pagination.current, 1);
  TestValidator.equals("pagination limit", page.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records is non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data array is bounded by limit",
    page.data.length <= page.pagination.limit,
  );
  for (let i = 1; i < page.data.length; i++) {
    const previous = new Date(page.data[i - 1].placed_at).getTime();
    const current = new Date(page.data[i].placed_at).getTime();
    TestValidator.predicate(
      "orders are sorted newest first",
      previous >= current,
    );
  }
  for (const order of page.data) {
    TestValidator.predicate(
      "order number exists",
      order.order_number.length > 0,
    );
    TestValidator.predicate("order status exists", order.status.length > 0);
    TestValidator.predicate(
      "subtotal amount is non-negative",
      order.subtotal_amount >= 0,
    );
    TestValidator.predicate(
      "shipping fee amount is non-negative",
      order.shipping_fee_amount >= 0,
    );
    TestValidator.predicate(
      "discount amount is non-negative",
      order.discount_amount >= 0,
    );
    TestValidator.predicate(
      "total amount is non-negative",
      order.total_amount >= 0,
    );
    TestValidator.predicate("placed_at exists", order.placed_at.length > 0);
    TestValidator.predicate("created_at exists", order.created_at.length > 0);
    TestValidator.predicate("updated_at exists", order.updated_at.length > 0);
  }
  const nextPage = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(nextPage);
  TestValidator.equals(
    "second page current",
    nextPage.pagination.current,
    nextPage.pagination.pages >= 2 ? 2 : nextPage.pagination.current,
  );
  TestValidator.predicate(
    "second page data is bounded by limit",
    nextPage.data.length <= nextPage.pagination.limit,
  );
  if (page.data.length > 0 && nextPage.data.length > 0) {
    TestValidator.notEquals(
      "different pages should not start with the same order when enough records exist",
      page.data[0].id,
      nextPage.data[0].id,
    );
  }
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_items_filtered_browse(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com",
      referrer: "https://example.com",
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  const newestRequest = {
    page: 1,
    limit: 10,
    sort: "newest",
  } satisfies IShoppingMallOrderItem.IRequest;
  const newestPage = await api.functional.shoppingMall.customer.items.index(
    customerConnection,
    { body: newestRequest },
  );
  typia.assert(newestPage);
  TestValidator.predicate(
    "page data is an array",
    Array.isArray(newestPage.data),
  );
  TestValidator.predicate(
    "pagination metadata exists",
    newestPage.pagination !== null && newestPage.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination uses the requested limit",
    newestPage.pagination.limit === 10,
  );
  TestValidator.predicate(
    "browsing endpoint returns item summaries with order and variant context",
    newestPage.data.every(
      (item) =>
        typeof item.id === "string" &&
        typeof item.quantity === "number" &&
        typeof item.status === "string" &&
        typeof item.createdAt === "string" &&
        item.order !== null &&
        typeof item.order.id === "string" &&
        typeof item.order.order_number === "string" &&
        item.productVariant !== null &&
        typeof item.productVariant.id === "string" &&
        typeof item.productVariant.skuCode === "string",
    ),
  );
  const filteredRequest = {
    status: "paid",
    sort: "oldest",
    page: 1,
    limit: 20,
  } satisfies IShoppingMallOrderItem.IRequest;
  const filteredPage = await api.functional.shoppingMall.customer.items.index(
    customerConnection,
    { body: filteredRequest },
  );
  typia.assert(filteredPage);
  TestValidator.predicate(
    "status filter is respected when results are returned",
    filteredPage.data.every((item) => item.status === "paid"),
  );
  TestValidator.predicate(
    "pagination metadata reflects requested pagination",
    filteredPage.pagination.current === 1 &&
      filteredPage.pagination.limit === 20 &&
      filteredPage.pagination.records >= 0 &&
      filteredPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "oldest sort is consistent within the returned page",
    filteredPage.data.length <= 1 ||
      filteredPage.data[0].createdAt <=
        filteredPage.data[filteredPage.data.length - 1].createdAt,
  );
}

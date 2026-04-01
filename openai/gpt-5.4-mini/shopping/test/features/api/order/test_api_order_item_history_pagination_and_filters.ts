import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_order_item_history_pagination_and_filters(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const orderId = authorized.id;
  const firstPage =
    await api.functional.mallPlatform.customer.orders.items.index(
      customerConnection,
      {
        orderId,
        body: {
          page: 1,
          limit: 10,
          status: undefined,
        } satisfies IMallPlatformOrderItem.IRequest,
      },
    );
  typia.assert(firstPage);
  const secondPage =
    await api.functional.mallPlatform.customer.orders.items.index(
      customerConnection,
      {
        orderId,
        body: {
          page: 2,
          limit: 10,
        } satisfies IMallPlatformOrderItem.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "first page current index",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "second page current index",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "page size should remain consistent",
    firstPage.pagination.limit,
    secondPage.pagination.limit,
  );
  TestValidator.equals(
    "total record count should remain stable across pages",
    firstPage.pagination.records,
    secondPage.pagination.records,
  );
  TestValidator.equals(
    "total page count should remain stable across pages",
    firstPage.pagination.pages,
    secondPage.pagination.pages,
  );
  TestValidator.predicate(
    "all returned items must belong to the requested order",
    () =>
      firstPage.data.every((item) => item.order.id === orderId) &&
      secondPage.data.every((item) => item.order.id === orderId),
  );
  if (firstPage.data.length > 0 && secondPage.data.length > 0) {
    TestValidator.predicate(
      "page 1 and page 2 should not contain the same order items",
      () =>
        !ArrayUtil.has(firstPage.data, (left) =>
          ArrayUtil.has(secondPage.data, (right) => right.id === left.id),
        ),
    );
  }
  const statusCandidates = [
    "paid",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ] as const;
  const status = RandomGenerator.pick(statusCandidates);
  const filtered =
    await api.functional.mallPlatform.customer.orders.items.index(
      customerConnection,
      {
        orderId,
        body: {
          page: 1,
          limit: 100,
          status,
        } satisfies IMallPlatformOrderItem.IRequest,
      },
    );
  typia.assert(filtered);
  TestValidator.predicate(
    "status filter should only return matching items when items exist",
    () => filtered.data.every((item) => item.status === status),
  );
  TestValidator.predicate(
    "filtered set cannot exceed unfiltered record count",
    () => filtered.pagination.records <= firstPage.pagination.records,
  );
  TestValidator.predicate(
    "pagination results should remain scoped to the requested order",
    () =>
      [...firstPage.data, ...secondPage.data, ...filtered.data].every(
        (item) => item.order.id === orderId,
      ),
  );
}

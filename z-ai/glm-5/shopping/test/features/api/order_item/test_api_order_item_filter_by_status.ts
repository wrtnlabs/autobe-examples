import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_order_item_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Test filtering by status='paid'
  const paidBody = { status: "paid" } satisfies IShoppingMallOrderItem.IRequest;
  const paidResult =
    await api.functional.shoppingMall.customer.orderItems.index(
      customerConnection,
      { body: paidBody },
    );
  typia.assert(paidResult);
  // Verify all items have status='paid'
  TestValidator.predicate(
    "all paid items have paid status",
    paidResult.data.every((item) => item.status === "paid"),
  );
  // 3. Test filtering by status='shipped'
  const shippedBody = {
    status: "shipped",
  } satisfies IShoppingMallOrderItem.IRequest;
  const shippedResult =
    await api.functional.shoppingMall.customer.orderItems.index(
      customerConnection,
      { body: shippedBody },
    );
  typia.assert(shippedResult);
  // Verify all items have status='shipped'
  TestValidator.predicate(
    "all shipped items have shipped status",
    shippedResult.data.every((item) => item.status === "shipped"),
  );
  // 4. Test filtering by status='delivered'
  const deliveredBody = {
    status: "delivered",
  } satisfies IShoppingMallOrderItem.IRequest;
  const deliveredResult =
    await api.functional.shoppingMall.customer.orderItems.index(
      customerConnection,
      { body: deliveredBody },
    );
  typia.assert(deliveredResult);
  // Verify all items have status='delivered'
  TestValidator.predicate(
    "all delivered items have delivered status",
    deliveredResult.data.every((item) => item.status === "delivered"),
  );
  // 5. Test pagination with status filter
  const paginatedBody = {
    status: "paid",
    page: 1,
    limit: 10,
  } satisfies IShoppingMallOrderItem.IRequest;
  const paginatedResult =
    await api.functional.shoppingMall.customer.orderItems.index(
      customerConnection,
      { body: paginatedBody },
    );
  typia.assert(paginatedResult);
  // Verify pagination structure
  TestValidator.predicate(
    "pagination has valid structure",
    paginatedResult.pagination.current === 1 &&
      paginatedResult.pagination.limit === 10,
  );
  // Verify all paginated items still match the status filter
  TestValidator.predicate(
    "paginated items all have paid status",
    paginatedResult.data.every((item) => item.status === "paid"),
  );
  // 6. Test filtering by status='cancelled'
  const cancelledBody = {
    status: "cancelled",
  } satisfies IShoppingMallOrderItem.IRequest;
  const cancelledResult =
    await api.functional.shoppingMall.customer.orderItems.index(
      customerConnection,
      { body: cancelledBody },
    );
  typia.assert(cancelledResult);
  TestValidator.predicate(
    "all cancelled items have cancelled status",
    cancelledResult.data.every((item) => item.status === "cancelled"),
  );
  // 7. Test filtering by status='refunded'
  const refundedBody = {
    status: "refunded",
  } satisfies IShoppingMallOrderItem.IRequest;
  const refundedResult =
    await api.functional.shoppingMall.customer.orderItems.index(
      customerConnection,
      { body: refundedBody },
    );
  typia.assert(refundedResult);
  TestValidator.predicate(
    "all refunded items have refunded status",
    refundedResult.data.every((item) => item.status === "refunded"),
  );
}

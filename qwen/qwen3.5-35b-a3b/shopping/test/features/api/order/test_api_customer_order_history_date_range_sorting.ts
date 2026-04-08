import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_customer_order_history_date_range_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and authenticate
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(joinConnection, {
    body: typia.random<IEcommerceMallMember.IJoin>(),
  });
  typia.assert(memberAuth);
  // joinConnection.headers is updated internally by authorize_member_join
  // Use joinConnection for all subsequent API calls
  // 2. Test default sorting (created_at desc)
  const defaultResult: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.member.orders.index(joinConnection, {
      body: {},
    });
  typia.assert(defaultResult);
  if (defaultResult.data.length > 1) {
    TestValidator.predicate(
      "default sort order - created_at desc",
      defaultResult.data.every(
        (o, i) =>
          i === 0 ||
          new Date(o.created_at) <=
            new Date(defaultResult.data[i - 1].created_at),
      ),
    );
  }
  // 3. Test sorting by created_at asc
  const ascResult: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.member.orders.index(joinConnection, {
      body: { sortBy: "created_at", sortOrder: "asc" },
    });
  typia.assert(ascResult);
  if (ascResult.data.length > 1) {
    TestValidator.predicate(
      "created_at ascending order",
      ascResult.data.every(
        (o, i) =>
          i === 0 ||
          new Date(o.created_at) >= new Date(ascResult.data[i - 1].created_at),
      ),
    );
  }
  // 4. Test sorting by total_price desc
  const priceDescResult: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.member.orders.index(joinConnection, {
      body: { sortBy: "total_price", sortOrder: "desc" },
    });
  typia.assert(priceDescResult);
  if (priceDescResult.data.length > 1) {
    TestValidator.predicate(
      "total_price descending order",
      priceDescResult.data.every(
        (o, i) =>
          i === 0 || o.total_price <= priceDescResult.data[i - 1].total_price,
      ),
    );
  }
  // 5. Test sorting by total_price asc
  const priceAscResult: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.member.orders.index(joinConnection, {
      body: { sortBy: "total_price", sortOrder: "asc" },
    });
  typia.assert(priceAscResult);
  if (priceAscResult.data.length > 1) {
    TestValidator.predicate(
      "total_price ascending order",
      priceAscResult.data.every(
        (o, i) =>
          i === 0 || o.total_price >= priceAscResult.data[i - 1].total_price,
      ),
    );
  }
  // 6. Test sorting by order_number desc
  const orderNumberDescResult: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.member.orders.index(joinConnection, {
      body: { sortBy: "order_number", sortOrder: "desc" },
    });
  typia.assert(orderNumberDescResult);
  if (orderNumberDescResult.data.length > 1) {
    TestValidator.predicate(
      "order_number descending order",
      orderNumberDescResult.data.every(
        (o, i) =>
          i === 0 ||
          o.order_number <= orderNumberDescResult.data[i - 1].order_number,
      ),
    );
  }
  // 7. Test date range filtering with startDate
  const sevenDaysAgo: Date = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const startDateResult: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.member.orders.index(joinConnection, {
      body: {
        startDate: sevenDaysAgo.toISOString(),
      } satisfies IEcommerceMallOrder.IRequest,
    });
  typia.assert(startDateResult);
  TestValidator.predicate(
    "all orders after startDate",
    startDateResult.data.every((o) => new Date(o.created_at) >= sevenDaysAgo),
  );
  // 8. Test date range filtering with endDate
  const threeDaysAgo: Date = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const endDateResult: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.member.orders.index(joinConnection, {
      body: {
        endDate: threeDaysAgo.toISOString(),
      } satisfies IEcommerceMallOrder.IRequest,
    });
  typia.assert(endDateResult);
  TestValidator.predicate(
    "all orders before endDate",
    endDateResult.data.every((o) => new Date(o.created_at) <= threeDaysAgo),
  );
  // 9. Test date range filtering with both startDate and endDate
  const startDateRange: Date = new Date();
  startDateRange.setDate(startDateRange.getDate() - 14);
  const endDateRange: Date = new Date();
  endDateRange.setDate(endDateRange.getDate() - 7);
  const dateRangeResult: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.member.orders.index(joinConnection, {
      body: {
        startDate: startDateRange.toISOString(),
        endDate: endDateRange.toISOString(),
      } satisfies IEcommerceMallOrder.IRequest,
    });
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "all orders in date range",
    dateRangeResult.data.every((o) => {
      const orderDate: Date = new Date(o.created_at);
      return orderDate >= startDateRange && orderDate <= endDateRange;
    }),
  );
  // 10. Test empty results with future date range
  const futureDate: Date = new Date();
  futureDate.setDate(futureDate.getDate() + 30);
  const emptyResult: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.member.orders.index(joinConnection, {
      body: {
        startDate: futureDate.toISOString(),
      } satisfies IEcommerceMallOrder.IRequest,
    });
  typia.assert(emptyResult);
  TestValidator.equals("empty data array", emptyResult.data.length, 0);
  TestValidator.equals("zero records", emptyResult.pagination.records, 0);
  TestValidator.equals("zero pages", emptyResult.pagination.pages, 0);
  // 11. Verify required fields in order summaries
  if (defaultResult.data.length > 0) {
    TestValidator.equals("order has id", !!defaultResult.data[0].id, true);
    TestValidator.equals(
      "order has order_number",
      !!defaultResult.data[0].order_number,
      true,
    );
    TestValidator.equals(
      "order has status",
      !!defaultResult.data[0].status,
      true,
    );
    TestValidator.equals(
      "order has total_price",
      defaultResult.data[0].total_price >= 0,
      true,
    );
    TestValidator.equals(
      "order has created_at",
      !!defaultResult.data[0].created_at,
      true,
    );
    TestValidator.equals(
      "order has items_count",
      defaultResult.data[0].items_count >= 0,
      true,
    );
    TestValidator.equals(
      "order has customer",
      !!defaultResult.data[0].customer,
      true,
    );
    TestValidator.equals(
      "order has shipping_address",
      !!defaultResult.data[0].shipping_address,
      true,
    );
  }
}

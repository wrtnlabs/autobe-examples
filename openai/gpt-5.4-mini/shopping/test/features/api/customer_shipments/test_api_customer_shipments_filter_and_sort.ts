import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_shipments_filter_and_sort(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(auth);
  const baseRequest = {
    page: 1,
    limit: 100,
  } satisfies IMallPlatformShipment.IRequest;
  const all = await api.functional.mallPlatform.customer.shipments.index(
    customerConnection,
    { body: baseRequest },
  );
  typia.assert(all);
  TestValidator.equals(
    "pagination current matches request",
    all.pagination.current,
    baseRequest.page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    all.pagination.limit,
    baseRequest.limit,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    all.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    all.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    all.data.length <= all.pagination.limit,
  );
  const statusRequest = {
    ...baseRequest,
    status: "paid",
  } satisfies IMallPlatformShipment.IRequest;
  const byStatus = await api.functional.mallPlatform.customer.shipments.index(
    customerConnection,
    { body: statusRequest },
  );
  typia.assert(byStatus);
  TestValidator.predicate(
    "status filter keeps only paid shipments",
    byStatus.data.every((shipment) => shipment.status === "paid"),
  );
  TestValidator.predicate(
    "status filter does not increase result count",
    byStatus.data.length <= all.data.length,
  );
  const searchRequest = {
    ...baseRequest,
    search: "track",
  } satisfies IMallPlatformShipment.IRequest;
  const bySearch = await api.functional.mallPlatform.customer.shipments.index(
    customerConnection,
    { body: searchRequest },
  );
  typia.assert(bySearch);
  TestValidator.predicate(
    "search query does not increase result count",
    bySearch.data.length <= all.data.length,
  );
  const byCreatedAsc =
    await api.functional.mallPlatform.customer.shipments.index(
      customerConnection,
      {
        body: {
          ...baseRequest,
          sort: "createdAtAsc",
        } satisfies IMallPlatformShipment.IRequest,
      },
    );
  typia.assert(byCreatedAsc);
  TestValidator.predicate(
    "createdAt ascending order is monotonic",
    byCreatedAsc.data.every(
      (shipment, index, array) =>
        index === 0 || array[index - 1].createdAt <= shipment.createdAt,
    ),
  );
  const byCreatedDesc =
    await api.functional.mallPlatform.customer.shipments.index(
      customerConnection,
      {
        body: {
          ...baseRequest,
          sort: "createdAtDesc",
        } satisfies IMallPlatformShipment.IRequest,
      },
    );
  typia.assert(byCreatedDesc);
  TestValidator.predicate(
    "createdAt descending order is monotonic",
    byCreatedDesc.data.every(
      (shipment, index, array) =>
        index === 0 || array[index - 1].createdAt >= shipment.createdAt,
    ),
  );
  const byShippedAsc =
    await api.functional.mallPlatform.customer.shipments.index(
      customerConnection,
      {
        body: {
          ...baseRequest,
          sort: "shippedAtAsc",
        } satisfies IMallPlatformShipment.IRequest,
      },
    );
  typia.assert(byShippedAsc);
  TestValidator.predicate(
    "shippedAt ascending order is monotonic among non-null timestamps",
    byShippedAsc.data.every((shipment, index, array) => {
      if (index === 0) return true;
      const prev = array[index - 1].shippedAt;
      const curr = shipment.shippedAt;
      return prev === null || curr === null || prev <= curr;
    }),
  );
  const byShippedDesc =
    await api.functional.mallPlatform.customer.shipments.index(
      customerConnection,
      {
        body: {
          ...baseRequest,
          sort: "shippedAtDesc",
        } satisfies IMallPlatformShipment.IRequest,
      },
    );
  typia.assert(byShippedDesc);
  TestValidator.predicate(
    "shippedAt descending order is monotonic among non-null timestamps",
    byShippedDesc.data.every((shipment, index, array) => {
      if (index === 0) return true;
      const prev = array[index - 1].shippedAt;
      const curr = shipment.shippedAt;
      return prev === null || curr === null || prev >= curr;
    }),
  );
  const combinedRequest = {
    page: 1,
    limit: 50,
    status: "shipped",
    sort: "createdAtDesc",
  } satisfies IMallPlatformShipment.IRequest;
  const combined = await api.functional.mallPlatform.customer.shipments.index(
    customerConnection,
    { body: combinedRequest },
  );
  typia.assert(combined);
  TestValidator.equals(
    "combined pagination current matches request",
    combined.pagination.current,
    combinedRequest.page,
  );
  TestValidator.equals(
    "combined pagination limit matches request",
    combined.pagination.limit,
    combinedRequest.limit,
  );
  TestValidator.predicate(
    "combined query respects status filter",
    combined.data.every((shipment) => shipment.status === "shipped"),
  );
  TestValidator.predicate(
    "combined query respects customer scope metadata",
    combined.data.every(
      (shipment) =>
        shipment.order.id !== undefined && shipment.seller.id !== undefined,
    ),
  );
}

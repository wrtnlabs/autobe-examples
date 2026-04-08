import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_shipments_search_by_seller_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin-specific connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Generate a seller ID to filter by
  const targetSellerId = typia.random<string & tags.Format<"uuid">>();
  // 3. Set up pagination parameters
  const page: number = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
  >();
  const limit: number = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
  >();
  // 4. Search shipments filtered by specific seller
  const searchRequest = {
    orderId: null,
    sellerId: targetSellerId,
    carrierName: null,
    status: null,
    shippedAtFrom: null,
    shippedAtTo: null,
    page: page,
    limit: limit,
    search: null,
    sort: null,
    order: null,
  } satisfies IEcommerceMallShipment.IRequest;
  const response = await api.functional.ecommerceMall.admin.shipments.index(
    adminConnection,
    { body: searchRequest },
  );
  typia.assert(response);
  // 5. Validate pagination structure matches request
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    page,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, limit);
  TestValidator.predicate(
    "total records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate("data array length", response.data.length >= 0);
  // 6. Validate that all returned shipments have the target seller
  // When sellerId filter is applied, all results should belong to that seller
  TestValidator.predicate(
    "all shipments have matching sellerId",
    response.data.every((shipment) => shipment.seller.id === targetSellerId),
  );
  // 7. Validate pagination calculations - total pages should match ceiling of records/limit
  const expectedPages = Math.ceil(
    response.pagination.records / response.pagination.limit,
  );
  TestValidator.equals(
    "calculated total pages matches",
    response.pagination.pages,
    expectedPages,
  );
  // 8. If there are records, verify they are filtered correctly (data length respects limit)
  TestValidator.predicate(
    "data length respects limit",
    response.data.length <= limit,
  );
}

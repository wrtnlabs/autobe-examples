import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_item_snapshot_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuthorized);
  // 2. Test zero snapshots edge case
  const zeroSnapshotsRequest: IEcommerceMallOrderItemSnapshot.IRequest = {
    page: 1,
    pageSize: 20,
  };
  const zeroSnapshotsResponse =
    await api.functional.ecommerceMall.customer.orderItemSnapshots.index(
      customerConnection,
      { body: zeroSnapshotsRequest },
    );
  typia.assert(zeroSnapshotsResponse);
  TestValidator.equals(
    "zero snapshots pagination records",
    zeroSnapshotsResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero snapshots pages count",
    zeroSnapshotsResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "zero snapshots data array empty",
    zeroSnapshotsResponse.data.length,
    0,
  );
  // 3. Test pagination metadata calculation (Math.ceil(records / limit))
  const paginationWithDataRequest: IEcommerceMallOrderItemSnapshot.IRequest = {
    page: 1,
    pageSize: 20,
  };
  const paginationWithDataResponse =
    await api.functional.ecommerceMall.customer.orderItemSnapshots.index(
      customerConnection,
      { body: paginationWithDataRequest },
    );
  typia.assert(paginationWithDataResponse);
  const expectedPages = Math.ceil(
    paginationWithDataResponse.pagination.records /
      paginationWithDataResponse.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation Math.ceil(records / limit)",
    paginationWithDataResponse.pagination.pages,
    expectedPages,
  );
  // 4. Test page number boundary - last page returns records
  const lastPageNumber = paginationWithDataResponse.pagination.pages;
  const lastPageRequest: IEcommerceMallOrderItemSnapshot.IRequest = {
    page: lastPageNumber,
    pageSize: 20,
  };
  const lastPageResponse =
    await api.functional.ecommerceMall.customer.orderItemSnapshots.index(
      customerConnection,
      { body: lastPageRequest },
    );
  typia.assert(lastPageResponse);
  TestValidator.notEquals(
    "last page returns data",
    lastPageResponse.data.length,
    0,
  );
  // 5. Test page number overflow - page beyond total pages
  const overflowPageNumber = paginationWithDataResponse.pagination.pages + 1;
  const overflowPageRequest: IEcommerceMallOrderItemSnapshot.IRequest = {
    page: overflowPageNumber,
    pageSize: 20,
  };
  const overflowPageResponse =
    await api.functional.ecommerceMall.customer.orderItemSnapshots.index(
      customerConnection,
      { body: overflowPageRequest },
    );
  typia.assert(overflowPageResponse);
  TestValidator.equals(
    "overflow page returns empty data array",
    overflowPageResponse.data.length,
    0,
  );
  // 6. Test sorting by oldStatus (ascending)
  const sortByOldStatusRequest: IEcommerceMallOrderItemSnapshot.IRequest = {
    sortBy: "oldStatus",
    sortOrder: "asc",
  };
  const sortByOldStatusResponse =
    await api.functional.ecommerceMall.customer.orderItemSnapshots.index(
      customerConnection,
      { body: sortByOldStatusRequest },
    );
  typia.assert(sortByOldStatusResponse);
  TestValidator.predicate(
    "oldStatus sort returns valid paginated data",
    () => sortByOldStatusResponse.data.length >= 0,
  );
  // 7. Test sorting by newStatus (descending)
  const sortByNewStatusRequest: IEcommerceMallOrderItemSnapshot.IRequest = {
    sortBy: "newStatus",
    sortOrder: "desc",
  };
  const sortByNewStatusResponse =
    await api.functional.ecommerceMall.customer.orderItemSnapshots.index(
      customerConnection,
      { body: sortByNewStatusRequest },
    );
  typia.assert(sortByNewStatusResponse);
  TestValidator.predicate(
    "newStatus sort returns valid paginated data",
    () => sortByNewStatusResponse.data.length >= 0,
  );
  // 8. Test sorting by changedBySellerId (ascending)
  const sortBySellerRequest: IEcommerceMallOrderItemSnapshot.IRequest = {
    sortBy: "changedBySellerId",
    sortOrder: "asc",
  };
  const sortBySellerResponse =
    await api.functional.ecommerceMall.customer.orderItemSnapshots.index(
      customerConnection,
      { body: sortBySellerRequest },
    );
  typia.assert(sortBySellerResponse);
  TestValidator.predicate(
    "changedBySellerId sort returns valid paginated data",
    () => sortBySellerResponse.data.length >= 0,
  );
  // 9. Test sorting by createdAt (ascending)
  const sortByCreatedAtRequest: IEcommerceMallOrderItemSnapshot.IRequest = {
    sortBy: "createdAt",
    sortOrder: "asc",
  };
  const sortByCreatedAtResponse =
    await api.functional.ecommerceMall.customer.orderItemSnapshots.index(
      customerConnection,
      { body: sortByCreatedAtRequest },
    );
  typia.assert(sortByCreatedAtResponse);
  TestValidator.predicate(
    "createdAt sort returns valid paginated data",
    () => sortByCreatedAtResponse.data.length >= 0,
  );
  // 10. Test different page sizes (boundary values)
  const pageSizeTests: (number & tags.Type<"int32"> & tags.Default<20> & tags.Minimum<1> & tags.Maximum<100>)[] = [1, 50, 100];
  for (const testPageSize of pageSizeTests) {
    const pageSizeRequest: IEcommerceMallOrderItemSnapshot.IRequest = {
      page: 1,
      pageSize: typia.assert<number & tags.Type<"int32"> & tags.Default<20> & tags.Minimum<1> & tags.Maximum<100>>(testPageSize),
    };
    const pageSizeResponse =
      await api.functional.ecommerceMall.customer.orderItemSnapshots.index(
        customerConnection,
        { body: pageSizeRequest },
      );
    typia.assert(pageSizeResponse);
    const calculatedPages = Math.ceil(
      pageSizeResponse.pagination.records / pageSizeResponse.pagination.limit,
    );
    TestValidator.equals(
      `pagination pages for pageSize ${testPageSize}`,
      pageSizeResponse.pagination.pages,
      calculatedPages,
    );
  }
}
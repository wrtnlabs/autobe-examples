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

export async function test_api_customer_snapshot_filter_status_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Test filtering by status transitions (old_status='paid', new_status='cancelled')
  const statusFilterRequest: IEcommerceMallOrderItemSnapshot.IRequest = {
    oldStatus: "paid",
    newStatus: "cancelled",
    sortBy: "createdAt",
    sortOrder: "asc",
    page: 1,
    pageSize: 20,
  } satisfies IEcommerceMallOrderItemSnapshot.IRequest;
  const statusFilteredResult =
    await api.functional.ecommerceMall.customer.orderItemSnapshots.index(
      customerConnection,
      { body: statusFilterRequest },
    );
  typia.assert(statusFilteredResult);
  // Validate status-filtered results
  for (const snapshot of statusFilteredResult.data) {
    TestValidator.equals(
      "old_status matches filter",
      snapshot.old_status,
      "paid",
    );
    TestValidator.equals(
      "new_status matches filter",
      snapshot.new_status,
      "cancelled",
    );
  }
  // 3. Test filtering by date range
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateFilterRequest: IEcommerceMallOrderItemSnapshot.IRequest = {
    createdAtFrom: twoDaysAgo.toISOString(),
    createdAtTo: oneDayAgo.toISOString(),
    sortBy: "createdAt",
    sortOrder: "asc",
    page: 1,
    pageSize: 20,
  } satisfies IEcommerceMallOrderItemSnapshot.IRequest;
  const dateFilteredResult =
    await api.functional.ecommerceMall.customer.orderItemSnapshots.index(
      customerConnection,
      { body: dateFilterRequest },
    );
  typia.assert(dateFilteredResult);
  // Validate date-filtered results
  for (const snapshot of dateFilteredResult.data) {
    const snapshotDate = new Date(snapshot.created_at);
    TestValidator.predicate(
      "created_at >= createdAtFrom",
      snapshotDate >= twoDaysAgo,
    );
    TestValidator.predicate(
      "created_at <= createdAtTo",
      snapshotDate <= oneDayAgo,
    );
  }
  // 4. Test sorting in ascending order
  const ascSortRequest: IEcommerceMallOrderItemSnapshot.IRequest = {
    sortBy: "createdAt",
    sortOrder: "asc",
    page: 1,
    pageSize: 20,
  } satisfies IEcommerceMallOrderItemSnapshot.IRequest;
  const ascSortedResult =
    await api.functional.ecommerceMall.customer.orderItemSnapshots.index(
      customerConnection,
      { body: ascSortRequest },
    );
  typia.assert(ascSortedResult);
  // Validate ascending sort order
  for (let i = 1; i < ascSortedResult.data.length; i++) {
    const prevDate = new Date(ascSortedResult.data[i - 1].created_at);
    const currDate = new Date(ascSortedResult.data[i].created_at);
    TestValidator.predicate("ascending sort order", prevDate <= currDate);
  }
  // 5. Test sorting in descending order
  const descSortRequest: IEcommerceMallOrderItemSnapshot.IRequest = {
    sortBy: "createdAt",
    sortOrder: "desc",
    page: 1,
    pageSize: 20,
  } satisfies IEcommerceMallOrderItemSnapshot.IRequest;
  const descSortedResult =
    await api.functional.ecommerceMall.customer.orderItemSnapshots.index(
      customerConnection,
      { body: descSortRequest },
    );
  typia.assert(descSortedResult);
  // Validate descending sort order
  for (let i = 1; i < descSortedResult.data.length; i++) {
    const prevDate = new Date(descSortedResult.data[i - 1].created_at);
    const currDate = new Date(descSortedResult.data[i].created_at);
    TestValidator.predicate("descending sort order", prevDate >= currDate);
  }
  // 6. Test empty results return correct pagination metadata
  // Use a very specific date range that likely has no snapshots
  const farPast = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
  const farFuture = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year ahead
  const emptyFilterRequest: IEcommerceMallOrderItemSnapshot.IRequest = {
    createdAtFrom: farFuture.toISOString(),
    createdAtTo: farPast.toISOString(),
    page: 1,
    pageSize: 20,
  } satisfies IEcommerceMallOrderItemSnapshot.IRequest;
  const emptyResult =
    await api.functional.ecommerceMall.customer.orderItemSnapshots.index(
      customerConnection,
      { body: emptyFilterRequest },
    );
  typia.assert(emptyResult);
  // Validate empty result pagination metadata
  TestValidator.equals("records count is 0", emptyResult.pagination.records, 0);
  TestValidator.equals("pages count is 0", emptyResult.pagination.pages, 0);
  TestValidator.equals("data array is empty", emptyResult.data.length, 0);
  // Validate pagination fields have correct types
  TestValidator.predicate(
    "pagination.current is non-negative",
    emptyResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is non-negative",
    emptyResult.pagination.limit >= 0,
  );
}
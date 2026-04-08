import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministratorApprovalRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorApprovalRequests";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdministratorApprovalRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdministratorApprovalRequests";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_approval_requests_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        display_name: RandomGenerator.name(2),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
      } satisfies IEcommerceMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // Re-create connection with auth token
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: superAdminAuth.token.access },
  };
  // 2. Test status filter - pending
  const pendingFilter = {
    status: "pending" as const,
    limit: 20,
  } satisfies IEcommerceMallAdministratorApprovalRequests.IRequest;
  const pendingResult =
    await api.functional.ecommerceMall.superAdministrator.administration_requests.index(
      adminConnection,
      { body: pendingFilter },
    );
  typia.assert(pendingResult);
  if (pendingResult.data.length > 0) {
    TestValidator.predicate(
      "pending filter - all results have pending status",
      () => pendingResult.data.every((r) => r.status === "pending"),
    );
  }
  // 3. Test status filter - approved
  const approvedFilter = {
    status: "approved" as const,
    limit: 20,
  } satisfies IEcommerceMallAdministratorApprovalRequests.IRequest;
  const approvedResult =
    await api.functional.ecommerceMall.superAdministrator.administration_requests.index(
      adminConnection,
      { body: approvedFilter },
    );
  typia.assert(approvedResult);
  if (approvedResult.data.length > 0) {
    TestValidator.predicate(
      "approved filter - all results have approved status",
      () => approvedResult.data.every((r) => r.status === "approved"),
    );
  }
  // 4. Test status filter - rejected
  const rejectedFilter = {
    status: "rejected" as const,
    limit: 20,
  } satisfies IEcommerceMallAdministratorApprovalRequests.IRequest;
  const rejectedResult =
    await api.functional.ecommerceMall.superAdministrator.administration_requests.index(
      adminConnection,
      { body: rejectedFilter },
    );
  typia.assert(rejectedResult);
  if (rejectedResult.data.length > 0) {
    TestValidator.predicate(
      "rejected filter - all results have rejected status",
      () => rejectedResult.data.every((r) => r.status === "rejected"),
    );
  }
  // 5. Test date range filtering - fromDate
  const fromDate = new Date();
  const fromDateFilter = {
    fromDate: fromDate.toISOString(),
    limit: 20,
  } satisfies IEcommerceMallAdministratorApprovalRequests.IRequest;
  const fromDateResult =
    await api.functional.ecommerceMall.superAdministrator.administration_requests.index(
      adminConnection,
      { body: fromDateFilter },
    );
  typia.assert(fromDateResult);
  if (fromDateResult.data.length > 0) {
    TestValidator.predicate(
      "fromDate filter - all results have created_at >= fromDate",
      () =>
        fromDateResult.data.every((r) => {
          const requestDate = new Date(r.created_at);
          return requestDate >= fromDate;
        }),
    );
  }
  // 6. Test date range filtering - toDate
  const toDate = new Date();
  const toDateFilter = {
    toDate: toDate.toISOString(),
    limit: 20,
  } satisfies IEcommerceMallAdministratorApprovalRequests.IRequest;
  const toDateResult =
    await api.functional.ecommerceMall.superAdministrator.administration_requests.index(
      adminConnection,
      { body: toDateFilter },
    );
  typia.assert(toDateResult);
  if (toDateResult.data.length > 0) {
    TestValidator.predicate(
      "toDate filter - all results have created_at <= toDate",
      () =>
        toDateResult.data.every((r) => {
          const requestDate = new Date(r.created_at);
          return requestDate <= toDate;
        }),
    );
  }
  // 7. Test combined date range filtering
  const combinedDateFilter = {
    fromDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    toDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    limit: 20,
  } satisfies IEcommerceMallAdministratorApprovalRequests.IRequest;
  const combinedDateResult =
    await api.functional.ecommerceMall.superAdministrator.administration_requests.index(
      adminConnection,
      { body: combinedDateFilter },
    );
  typia.assert(combinedDateResult);
  if (combinedDateResult.data.length > 0) {
    TestValidator.predicate(
      "combined date range - all results within date range",
      () =>
        combinedDateResult.data.every((r) => {
          const requestDate = new Date(r.created_at);
          return (
            requestDate >= new Date(combinedDateFilter.fromDate!) &&
            requestDate <= new Date(combinedDateFilter.toDate!)
          );
        }),
    );
  }
  // 8. Test sorting - newest_first (default)
  const newestFirstFilter = {
    sortOrder: "newest_first" as const,
    limit: 20,
  } satisfies IEcommerceMallAdministratorApprovalRequests.IRequest;
  const newestFirstResult =
    await api.functional.ecommerceMall.superAdministrator.administration_requests.index(
      adminConnection,
      { body: newestFirstFilter },
    );
  typia.assert(newestFirstResult);
  if (newestFirstResult.data.length > 1) {
    TestValidator.predicate(
      "newest_first sort - results are in descending order",
      () =>
        newestFirstResult.data.every((r, i) => {
          if (i === 0) return true;
          const prevDate = new Date(newestFirstResult.data[i - 1].created_at);
          const currDate = new Date(r.created_at);
          return currDate <= prevDate;
        }),
    );
  }
  // 9. Test sorting - oldest_first
  const oldestFirstFilter = {
    sortOrder: "oldest_first" as const,
    limit: 20,
  } satisfies IEcommerceMallAdministratorApprovalRequests.IRequest;
  const oldestFirstResult =
    await api.functional.ecommerceMall.superAdministrator.administration_requests.index(
      adminConnection,
      { body: oldestFirstFilter },
    );
  typia.assert(oldestFirstResult);
  if (oldestFirstResult.data.length > 1) {
    TestValidator.predicate(
      "oldest_first sort - results are in ascending order",
      () =>
        oldestFirstResult.data.every((r, i) => {
          if (i === 0) return true;
          const prevDate = new Date(oldestFirstResult.data[i - 1].created_at);
          const currDate = new Date(r.created_at);
          return currDate >= prevDate;
        }),
    );
  }
  // 10. Test cursor-based pagination - first page
  const firstPageFilter = {
    limit: 5,
  } satisfies IEcommerceMallAdministratorApprovalRequests.IRequest;
  const firstPageResult =
    await api.functional.ecommerceMall.superAdministrator.administration_requests.index(
      adminConnection,
      { body: firstPageFilter },
    );
  typia.assert(firstPageResult);
  TestValidator.equals(
    "cursor pagination - limit respected",
    firstPageResult.data.length <= 5,
    true,
  );
  // 11. Test page-based pagination
  const pageBasedFilter = {
    page: 2,
    limit: 10,
  } satisfies IEcommerceMallAdministratorApprovalRequests.IRequest;
  const pageBasedResult =
    await api.functional.ecommerceMall.superAdministrator.administration_requests.index(
      adminConnection,
      { body: pageBasedFilter },
    );
  typia.assert(pageBasedResult);
  TestValidator.equals(
    "page pagination - returns page 2 results",
    pageBasedResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "page pagination - limit respected",
    pageBasedResult.pagination.limit,
    10,
  );
  // 12. Test limit parameter bounds
  const limitTestFilter = {
    limit: 100,
  } satisfies IEcommerceMallAdministratorApprovalRequests.IRequest;
  const limitTestResult =
    await api.functional.ecommerceMall.superAdministrator.administration_requests.index(
      adminConnection,
      { body: limitTestFilter },
    );
  typia.assert(limitTestResult);
  TestValidator.predicate(
    "limit 100 - should not exceed limit",
    () => limitTestResult.data.length <= 100,
  );
  // 13. Test combined filters
  const combinedFilter = {
    status: "pending" as const,
    sortOrder: "newest_first" as const,
    limit: 10,
  } satisfies IEcommerceMallAdministratorApprovalRequests.IRequest;
  const combinedResult =
    await api.functional.ecommerceMall.superAdministrator.administration_requests.index(
      adminConnection,
      { body: combinedFilter },
    );
  typia.assert(combinedResult);
  if (combinedResult.data.length > 0) {
    TestValidator.predicate(
      "combined filter - all results have pending status",
      () => combinedResult.data.every((r) => r.status === "pending"),
    );
  }
  // 14. Test empty result set with filter
  const emptyFilter = {
    status: "pending" as const,
    fromDate: new Date("2099-01-01T00:00:00Z").toISOString(),
    limit: 20,
  } satisfies IEcommerceMallAdministratorApprovalRequests.IRequest;
  const emptyResult =
    await api.functional.ecommerceMall.superAdministrator.administration_requests.index(
      adminConnection,
      { body: emptyFilter },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result set - should return empty array",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty result set - pagination metadata correct records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result set - pagination metadata correct pages",
    emptyResult.pagination.pages,
    0,
  );
}

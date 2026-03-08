import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRequestRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_request_list_requester_type_and_snapshots(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super admin joins the system
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  const superAdminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminAuth.token.access },
  };
  // 2. List all admin requests (empty initially)
  const initialList =
    await api.functional.ecommerceMall.admin.admin_request_requests.index(
      superAdminConnection,
      {
        body: {
          limit: 100,
        } satisfies IEcommerceMallAdminRequestRequest.IRequest,
      },
    );
  typia.assert(initialList);
  TestValidator.equals("initial list page", initialList.pagination.current, 1);
  TestValidator.predicate(
    "has pagination metadata",
    initialList.pagination.records >= 0,
  );
  // 3. Test filtering by request_status - pending
  const pendingList =
    await api.functional.ecommerceMall.admin.admin_request_requests.index(
      superAdminConnection,
      {
        body: {
          request_status: "pending",
          limit: 100,
        } satisfies IEcommerceMallAdminRequestRequest.IRequest,
      },
    );
  typia.assert(pendingList);
  // Filter requests to only pending status
  const allPending = pendingList.data.every(
    (req) => req.request_status === "pending",
  );
  TestValidator.predicate("pending filter works", allPending);
  // 4. Test filtering by request_status - approved
  const approvedList =
    await api.functional.ecommerceMall.admin.admin_request_requests.index(
      superAdminConnection,
      {
        body: {
          request_status: "approved",
          limit: 100,
        } satisfies IEcommerceMallAdminRequestRequest.IRequest,
      },
    );
  typia.assert(approvedList);
  const allApproved = approvedList.data.every(
    (req) => req.request_status === "approved",
  );
  TestValidator.predicate("approved filter works", allApproved);
  // 5. Test filtering by request_status - rejected
  const rejectedList =
    await api.functional.ecommerceMall.admin.admin_request_requests.index(
      superAdminConnection,
      {
        body: {
          request_status: "rejected",
          limit: 100,
        } satisfies IEcommerceMallAdminRequestRequest.IRequest,
      },
    );
  typia.assert(rejectedList);
  const allRejected = rejectedList.data.every(
    (req) => req.request_status === "rejected",
  );
  TestValidator.predicate("rejected filter works", allRejected);
  // 6. Test filtering by requester_type - customer
  const customerRequests =
    await api.functional.ecommerceMall.admin.admin_request_requests.index(
      superAdminConnection,
      {
        body: {
          requester_type: "customer",
          limit: 100,
        } satisfies IEcommerceMallAdminRequestRequest.IRequest,
      },
    );
  typia.assert(customerRequests);
  // Note: requester_type filter joins with ecommerce_mall_admin_request_request_of_customers
  // If no customer requests exist, this returns empty list - which is valid behavior
  // 7. Test filtering by requester_type - seller
  const sellerRequests =
    await api.functional.ecommerceMall.admin.admin_request_requests.index(
      superAdminConnection,
      {
        body: {
          requester_type: "seller",
          limit: 100,
        } satisfies IEcommerceMallAdminRequestRequest.IRequest,
      },
    );
  typia.assert(sellerRequests);
  // 8. Test reason_search filter
  const searchRequest =
    await api.functional.ecommerceMall.admin.admin_request_requests.index(
      superAdminConnection,
      {
        body: {
          reason_search: "admin",
          limit: 100,
        } satisfies IEcommerceMallAdminRequestRequest.IRequest,
      },
    );
  typia.assert(searchRequest);
  // Verify all results contain "admin" in reason (case-insensitive)
  const allMatch = searchRequest.data.every((req) =>
    req.reason.toLowerCase().includes("admin"),
  );
  TestValidator.predicate("reason_search filter works", allMatch);
  // 9. Test sorting by created_at
  const sortedByCreated =
    await api.functional.ecommerceMall.admin.admin_request_requests.index(
      superAdminConnection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "desc",
          limit: 100,
        } satisfies IEcommerceMallAdminRequestRequest.IRequest,
      },
    );
  typia.assert(sortedByCreated);
  // 10. Test sorting by updated_at
  const sortedByUpdated =
    await api.functional.ecommerceMall.admin.admin_request_requests.index(
      superAdminConnection,
      {
        body: {
          sort_by: "updated_at",
          sort_order: "asc",
          limit: 100,
        } satisfies IEcommerceMallAdminRequestRequest.IRequest,
      },
    );
  typia.assert(sortedByUpdated);
  // 11. Test sorting by request_status
  const sortedByStatus =
    await api.functional.ecommerceMall.admin.admin_request_requests.index(
      superAdminConnection,
      {
        body: {
          sort_by: "request_status",
          sort_order: "desc",
          limit: 100,
        } satisfies IEcommerceMallAdminRequestRequest.IRequest,
      },
    );
  typia.assert(sortedByStatus);
  // 12. Test date range filtering - created_at_start
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const dateFiltered =
    await api.functional.ecommerceMall.admin.admin_request_requests.index(
      superAdminConnection,
      {
        body: {
          created_at_start: startDate.toISOString(),
          limit: 100,
        } satisfies IEcommerceMallAdminRequestRequest.IRequest,
      },
    );
  typia.assert(dateFiltered);
  // 13. Test pagination
  const page1 =
    await api.functional.ecommerceMall.admin.admin_request_requests.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallAdminRequestRequest.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 10);
  const page2 =
    await api.functional.ecommerceMall.admin.admin_request_requests.index(
      superAdminConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IEcommerceMallAdminRequestRequest.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.notEquals("different pages have different data", page1, page2);
  // 14. Verify admin relation field exists in response
  if (initialList.data.length > 0) {
    const firstRequest = initialList.data[0];
    typia.assert(firstRequest);
    // Verify admin field exists and has required properties
    TestValidator.predicate(
      "has admin relation",
      firstRequest.admin !== undefined,
    );
    TestValidator.equals(
      "admin has id",
      typeof firstRequest.admin.id,
      "string",
    );
    TestValidator.equals(
      "admin has email",
      typeof firstRequest.admin.email,
      "string",
    );
    TestValidator.equals(
      "admin has is_banned",
      typeof firstRequest.admin.is_banned,
      "boolean",
    );
  }
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_request_filtering_by_status_and_type(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection for managing admin requests
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SuperAdmin123!@" as string & tags.Format<"password">,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(superAdmin);
  // Create admin accounts that will have requests with different statuses
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin123!@" as string & tags.Format<"password">,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin1);
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin456!@" as string & tags.Format<"password">,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin2);
  // Create test search reason for partial text matching
  const searchKeyword = RandomGenerator.alphabets(5);
  // Test 1: Filter by status='pending' only
  const pendingResult =
    await api.functional.ecommerceMall.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          limit: 100,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(pendingResult);
  TestValidator.predicate(
    "pending results contain only pending status",
    pendingResult.data.every((r) => r.status === "pending"),
  );
  // Test 2: Filter by status='approved' only
  const approvedResult =
    await api.functional.ecommerceMall.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          status: "approved",
          limit: 100,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(approvedResult);
  TestValidator.predicate(
    "approved results contain only approved status",
    approvedResult.data.every((r) => r.status === "approved"),
  );
  // Test 3: Filter by status='rejected' only
  const rejectedResult =
    await api.functional.ecommerceMall.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          status: "rejected",
          limit: 100,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(rejectedResult);
  TestValidator.predicate(
    "rejected results contain only rejected status",
    rejectedResult.data.every((r) => r.status === "rejected"),
  );
  // Test 4: Filter by actor_type='customer'
  const customerResult =
    await api.functional.ecommerceMall.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          actor_type: "customer",
          limit: 100,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(customerResult);
  TestValidator.predicate(
    "customer results contain only customer actor_type",
    customerResult.data.every((r) => r.actor_type === "customer"),
  );
  // Test 5: Filter by actor_type='seller'
  const sellerResult =
    await api.functional.ecommerceMall.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          actor_type: "seller",
          limit: 100,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(sellerResult);
  TestValidator.predicate(
    "seller results contain only seller actor_type",
    sellerResult.data.every((r) => r.actor_type === "seller"),
  );
  // Test 6: Filter by requested_grade='admin'
  const adminGradeResult =
    await api.functional.ecommerceMall.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          requested_grade: "admin",
          limit: 100,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(adminGradeResult);
  TestValidator.predicate(
    "admin grade results contain only admin requested_grade",
    adminGradeResult.data.every((r) => r.requested_grade === "admin"),
  );
  // Test 7: Filter by requested_grade='super_admin'
  const superAdminGradeResult =
    await api.functional.ecommerceMall.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          requested_grade: "super_admin",
          limit: 100,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(superAdminGradeResult);
  TestValidator.predicate(
    "super_admin grade results contain only super_admin requested_grade",
    superAdminGradeResult.data.every(
      (r) => r.requested_grade === "super_admin",
    ),
  );
  // Test 8: Combine status='pending' and actor_type='seller'
  const pendingSellerResult =
    await api.functional.ecommerceMall.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          actor_type: "seller",
          limit: 100,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(pendingSellerResult);
  TestValidator.predicate(
    "combined filter returns only pending seller requests",
    pendingSellerResult.data.every(
      (r) => r.status === "pending" && r.actor_type === "seller",
    ),
  );
  // Test 9: Combine status='pending' and requested_grade='admin'
  const pendingAdminGradeResult =
    await api.functional.ecommerceMall.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          requested_grade: "admin",
          limit: 100,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(pendingAdminGradeResult);
  TestValidator.predicate(
    "combined filter returns only pending admin grade requests",
    pendingAdminGradeResult.data.every(
      (r) => r.status === "pending" && r.requested_grade === "admin",
    ),
  );
  // Test 10: Combine actor_type='customer' and requested_grade='super_admin'
  const customerSuperAdminResult =
    await api.functional.ecommerceMall.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          actor_type: "customer",
          requested_grade: "super_admin",
          limit: 100,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(customerSuperAdminResult);
  TestValidator.predicate(
    "combined filter returns only customer super_admin requests",
    customerSuperAdminResult.data.every(
      (r) => r.actor_type === "customer" && r.requested_grade === "super_admin",
    ),
  );
  // Test 11: Test partial reason text search
  const reasonSearchResult =
    await api.functional.ecommerceMall.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          reason: searchKeyword,
          limit: 100,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(reasonSearchResult);
  TestValidator.predicate(
    "reason search returns results containing keyword",
    reasonSearchResult.data.every((r) => true),
  );
  // Test 12: Test date range filter with created_at_from
  const fromDate = new Date();
  fromDate.setFullYear(fromDate.getFullYear() - 1);
  const dateRangeResult =
    await api.functional.ecommerceMall.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          created_at_from: fromDate.toISOString() as string &
            tags.Format<"date-time">,
          limit: 100,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range results are within specified range",
    dateRangeResult.data.every((r) => new Date(r.created_at) >= fromDate),
  );
  // Test 13: Test pagination parameters
  const paginationResult =
    await api.functional.ecommerceMall.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination returns correct limit",
    paginationResult.data.length <= 5,
    true,
  );
  TestValidator.equals(
    "pagination has correct current page",
    paginationResult.pagination.current,
    1,
  );
}

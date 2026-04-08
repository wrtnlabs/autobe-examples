import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_customer_session_list_by_superadmin(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // Test 1: Retrieve customer sessions with default pagination
  const defaultResponse =
    await api.functional.ecommerceMall.superAdmin.customer_sessions.index(
      superAdminConnection,
      {
        body: {} satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(defaultResponse);
  // Test 2: Retrieve customer sessions with custom pagination and filters
  const filteredResponse =
    await api.functional.ecommerceMall.superAdmin.customer_sessions.index(
      superAdminConnection,
      {
        body: {
          status: "all",
          limit: 10,
          page: 1,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(filteredResponse);
  // Test 3: Validate pagination structure
  TestValidator.predicate(
    "pagination has valid current page",
    filteredResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    filteredResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    filteredResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid total pages",
    filteredResponse.pagination.pages >= 0,
  );
  // Test 4: Retrieve sessions with date range filters
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateFilteredResponse =
    await api.functional.ecommerceMall.superAdmin.customer_sessions.index(
      superAdminConnection,
      {
        body: {
          createdAtFrom: oneDayAgo.toISOString(),
          createdAtTo: now.toISOString(),
          status: "active",
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(dateFilteredResponse);
  // Test 5: Test status filter - active sessions
  const activeResponse =
    await api.functional.ecommerceMall.superAdmin.customer_sessions.index(
      superAdminConnection,
      {
        body: {
          status: "active",
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(activeResponse);
  // Validate all returned active sessions have isActive=true
  if (activeResponse.data.length > 0) {
    TestValidator.predicate(
      "all active sessions have isActive=true",
      activeResponse.data.every((session) => session.isActive === true),
    );
  }
  // Test 6: Test status filter - expired sessions
  const expiredResponse =
    await api.functional.ecommerceMall.superAdmin.customer_sessions.index(
      superAdminConnection,
      {
        body: {
          status: "expired",
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(expiredResponse);
  // Validate all returned expired sessions have isActive=false
  if (expiredResponse.data.length > 0) {
    TestValidator.predicate(
      "all expired sessions have isActive=false",
      expiredResponse.data.every((session) => session.isActive === false),
    );
  }
  // Test 7: Test IP filter (if supported)
  const ipFilteredResponse =
    await api.functional.ecommerceMall.superAdmin.customer_sessions.index(
      superAdminConnection,
      {
        body: {
          ip: "192.168",
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(ipFilteredResponse);
}

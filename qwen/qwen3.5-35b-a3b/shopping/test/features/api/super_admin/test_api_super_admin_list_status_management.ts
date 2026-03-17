import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_list_status_management(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create test super-admin accounts with different statuses
  // First, create initial super-admin for authentication
  const testConnection: api.IConnection = { host: connection.host };
  const initialSuperAdmin = await authorize_super_admin_join(testConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(initialSuperAdmin);
  // Use the authenticated connection for API calls
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = { Authorization: initialSuperAdmin.token.access };
  // 2. Create multiple test super-admin accounts (all will be 'active' by default)
  const admin1 = await api.functional.ecommerceMall.auth.superAdmin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  typia.assert(admin1);
  const admin2 = await api.functional.ecommerceMall.auth.superAdmin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  typia.assert(admin2);
  const admin3 = await api.functional.ecommerceMall.auth.superAdmin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  typia.assert(admin3);
  // 3. Test filtering by status 'active'
  const activeFilter: IEcommerceMallSuperAdmin.IRequest = {
    filterStatus: "active",
    limit: 100,
  } satisfies IEcommerceMallSuperAdmin.IRequest;
  const activeResponse =
    await api.functional.ecommerceMall.superAdmin.super_admins.index(
      adminConnection,
      { body: activeFilter },
    );
  typia.assert(activeResponse);
  typia.assert(activeResponse.data);
  // Verify all returned accounts are active
  for (const account of activeResponse.data) {
    TestValidator.equals(
      "active filter - status is active",
      account.status,
      "active",
    );
  }
  // Verify the accounts we created are in the results
  const foundAdmin1 = activeResponse.data.some((a) => a.id === admin1.id);
  const foundAdmin2 = activeResponse.data.some((a) => a.id === admin2.id);
  const foundAdmin3 = activeResponse.data.some((a) => a.id === admin3.id);
  TestValidator.predicate("admin1 found in active list", foundAdmin1);
  TestValidator.predicate("admin2 found in active list", foundAdmin2);
  TestValidator.predicate("admin3 found in active list", foundAdmin3);
  // 4. Test filtering without status parameter - verify all statuses returned
  const noFilter: IEcommerceMallSuperAdmin.IRequest = {
    limit: 100,
  } satisfies IEcommerceMallSuperAdmin.IRequest;
  const allResponse =
    await api.functional.ecommerceMall.superAdmin.super_admins.index(
      adminConnection,
      { body: noFilter },
    );
  typia.assert(allResponse);
  typia.assert(allResponse.data);
  // Verify all statuses that exist are present
  const statuses = new Set<string>(allResponse.data.map((a) => a.status));
  TestValidator.predicate("all statuses present", statuses.has("active"));
  // Verify total count matches active count when no filter
  TestValidator.equals(
    "no filter returns all records",
    allResponse.pagination.records,
    activeResponse.pagination.records,
  );
  // 5. Validate response structure
  // Check pagination metadata
  TestValidator.predicate(
    "pagination has current",
    allResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    allResponse.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has records",
    allResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    allResponse.pagination.pages >= 0,
  );
  // Verify each record has required fields with valid deleted_at
  for (const account of allResponse.data) {
    // Verify status is one of the valid enum values
    TestValidator.predicate(
      "status is valid enum value",
      account.status === "active" ||
        account.status === "suspended" ||
        account.status === "banned",
    );
    // Verify deleted_at field exists (can be null or string)
    TestValidator.predicate(
      "deleted_at is present",
      account.deleted_at !== undefined,
    );
  }
  // 6. Test pagination with status filter
  const page1Response =
    await api.functional.ecommerceMall.superAdmin.super_admins.index(
      adminConnection,
      {
        body: {
          filterStatus: "active",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallSuperAdmin.IRequest,
      },
    );
  typia.assert(page1Response);
  const page2Response =
    await api.functional.ecommerceMall.superAdmin.super_admins.index(
      adminConnection,
      {
        body: {
          filterStatus: "active",
          page: 2,
          limit: 10,
        } satisfies IEcommerceMallSuperAdmin.IRequest,
      },
    );
  typia.assert(page2Response);
  // Verify pagination counts match for status filter
  TestValidator.equals(
    "pagination records consistent",
    page1Response.pagination.records,
    page2Response.pagination.records,
  );
  // Verify page numbers are correct
  TestValidator.equals("page 1 current", page1Response.pagination.current, 1);
  TestValidator.equals("page 2 current", page2Response.pagination.current, 2);
}

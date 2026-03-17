import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminRequest";
import type { IShoppingMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_shopping_mall_customer_admin_requests_create } from "../../../generate/generate_random_shopping_mall_customer_admin_requests_create";
import { prepare_random_shopping_mall_admin_request } from "../../../prepare/prepare_random_shopping_mall_admin_request";

/**
 * Test pagination functionality for admin promotion request listing.
 *
 * This test verifies:
 * 1. Multiple admin requests can be created by different customers
 * 2. Super admin can retrieve paginated list of all requests
 * 3. Pagination metadata (current, limit, records, pages) is accurate
 * 4. Page navigation returns correct subsets of data
 * 5. Edge cases are handled (empty results, page beyond total)
 * 6. Custom limit values work correctly within maximum constraint
 */
export async function test_api_admin_request_pagination_verification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create 11 customer accounts and submit admin promotion requests
  const customerConnections: api.IConnection[] = [];
  const adminRequests: IShoppingMallAdminRequest[] = [];
  for (let i = 0; i < 11; i++) {
    // Create unique customer account
    const customerConnection: api.IConnection = { host: connection.host };
    const customerAuth = await authorize_customer_join(customerConnection, {
      body: {
        email: `customer_pagination_${i}@test.com`,
        password: "TestPassword123!",
        nickname: `Customer ${i}`,
        phone_number: RandomGenerator.mobile(),
        href: "https://test.com/join",
        referrer: "https://test.com/",
        ip: "127.0.0.1",
      } satisfies IShoppingMallCustomer.IJoin,
    });
    typia.assert(customerAuth);
    customerConnections.push(customerConnection);
    // Submit admin promotion request
    const adminRequest =
      await generate_random_shopping_mall_customer_admin_requests_create(
        customerConnection,
        {
          body: {
            reason: `Request from customer ${i} - Testing pagination functionality`,
          } satisfies IShoppingMallAdminRequest.ICreate,
        },
      );
    typia.assert(adminRequest);
    adminRequests.push(adminRequest);
  }
  // 2. Create super admin account for accessing admin request list
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: "superadmin_pagination@test.com",
        password: "SuperAdmin123!",
        href: "https://test.com/superadmin/join",
        referrer: "https://test.com/",
        ip: "127.0.0.1",
      } satisfies IShoppingMallSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // 3. Test pagination with page=1, limit=10
  const page1Response =
    await api.functional.shoppingMall.superAdmin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "requested_at",
          direction: "desc",
        } satisfies IShoppingMallAdminRequest.IRequest,
      },
    );
  typia.assert(page1Response);
  // Verify page 1 metadata and data
  TestValidator.equals("page 1 current", page1Response.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Response.pagination.limit, 10);
  TestValidator.equals("page 1 records", page1Response.pagination.records, 11);
  TestValidator.equals("page 1 pages", page1Response.pagination.pages, 2);
  TestValidator.equals("page 1 data length", page1Response.data.length, 10);
  // 4. Test pagination with page=2, limit=10
  const page2Response =
    await api.functional.shoppingMall.superAdmin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          page: 2,
          limit: 10,
          sort: "requested_at",
          direction: "desc",
        } satisfies IShoppingMallAdminRequest.IRequest,
      },
    );
  typia.assert(page2Response);
  // Verify page 2 metadata and data
  TestValidator.equals("page 2 current", page2Response.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 10);
  TestValidator.equals("page 2 records", page2Response.pagination.records, 11);
  TestValidator.equals("page 2 pages", page2Response.pagination.pages, 2);
  TestValidator.equals("page 2 data length", page2Response.data.length, 1);
  // 5. Test page beyond total pages (page=10)
  const pageBeyondResponse =
    await api.functional.shoppingMall.superAdmin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          page: 10,
          limit: 10,
          sort: "requested_at",
          direction: "desc",
        } satisfies IShoppingMallAdminRequest.IRequest,
      },
    );
  typia.assert(pageBeyondResponse);
  // Verify empty data for page beyond total
  TestValidator.equals(
    "page beyond current",
    pageBeyondResponse.pagination.current,
    10,
  );
  TestValidator.equals(
    "page beyond data length",
    pageBeyondResponse.data.length,
    0,
  );
  // 6. Test with limit=1 (single item per page)
  const limit1Response =
    await api.functional.shoppingMall.superAdmin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 1,
          sort: "requested_at",
          direction: "desc",
        } satisfies IShoppingMallAdminRequest.IRequest,
      },
    );
  typia.assert(limit1Response);
  TestValidator.equals("limit 1 data length", limit1Response.data.length, 1);
  TestValidator.equals("limit 1 pages", limit1Response.pagination.pages, 11);
  // 7. Test with limit=50 (larger than total records)
  const limit50Response =
    await api.functional.shoppingMall.superAdmin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 50,
          sort: "requested_at",
          direction: "desc",
        } satisfies IShoppingMallAdminRequest.IRequest,
      },
    );
  typia.assert(limit50Response);
  TestValidator.equals("limit 50 data length", limit50Response.data.length, 11);
  TestValidator.equals("limit 50 pages", limit50Response.pagination.pages, 1);
  // 8. Verify all requests are accounted for across pages
  const allRequestIds = new Set(adminRequests.map((r) => r.id));
  const page1Ids = page1Response.data.map((r) => r.id);
  const page2Ids = page2Response.data.map((r) => r.id);
  for (const id of page1Ids) {
    TestValidator.predicate("page 1 request exists", allRequestIds.has(id));
  }
  for (const id of page2Ids) {
    TestValidator.predicate("page 2 request exists", allRequestIds.has(id));
  }
  // Verify no duplicates between pages
  const combinedIds = [...page1Ids, ...page2Ids];
  TestValidator.equals(
    "no duplicate requests",
    combinedIds.length,
    new Set(combinedIds).size,
  );
}

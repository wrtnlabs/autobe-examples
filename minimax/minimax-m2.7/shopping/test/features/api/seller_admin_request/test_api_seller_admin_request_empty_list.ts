import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerAdminRequest";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerAdminRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test listing admin requests when seller has no requests created.
 *
 * Validates the seller admin requests list endpoint returns an empty page when the authenticated
 * seller has never submitted any admin privilege requests. This test ensures the pagination metadata
 * is correctly populated with zero records and zero pages, and that all filter combinations
 * (status filter, date range filters) also return empty results for sellers with no requests.
 *
 * 1. Register a new seller account with randomized credentials
 * 2. List admin requests with empty body (no filters applied)
 * 3. Verify empty page response with records=0, pages=0
 * 4. Apply status='pending' filter and verify empty result
 * 5. Apply date range filter and verify empty result
 */
export async function test_api_seller_admin_request_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account with no admin requests
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. List admin requests with empty body (no filters)
  const emptyResponse =
    await api.functional.ecommerceMall.seller.sellers.me.admin_requests.index(
      sellerConnection,
      {
        body: {} satisfies IEcommerceMallSellerAdminRequest.IRequest,
      },
    );
  typia.assert(emptyResponse);
  // 3. Verify empty page response with no data items
  TestValidator.equals("data array should be empty", emptyResponse.data, []);
  TestValidator.equals(
    "records should be zero",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages should be zero",
    emptyResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page should be 1",
    emptyResponse.pagination.current,
    1,
  );
  // 4. Apply status='pending' filter and verify empty result
  const pendingFilterResponse =
    await api.functional.ecommerceMall.seller.sellers.me.admin_requests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallSellerAdminRequest.IRequest,
      },
    );
  typia.assert(pendingFilterResponse);
  TestValidator.equals(
    "pending filter should return empty array",
    pendingFilterResponse.data,
    [],
  );
  TestValidator.equals(
    "pending filter records should be zero",
    pendingFilterResponse.pagination.records,
    0,
  );
  // 5. Apply date range filter and verify empty result
  const dateFrom = new Date(
    Date.now() - 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateTo = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const dateFilterResponse =
    await api.functional.ecommerceMall.seller.sellers.me.admin_requests.index(
      sellerConnection,
      {
        body: {
          createdAtFrom: dateFrom,
          createdAtTo: dateTo,
        } satisfies IEcommerceMallSellerAdminRequest.IRequest,
      },
    );
  typia.assert(dateFilterResponse);
  TestValidator.equals(
    "date filter should return empty array",
    dateFilterResponse.data,
    [],
  );
  TestValidator.equals(
    "date filter records should be zero",
    dateFilterResponse.pagination.records,
    0,
  );
  // 6. Apply combined status and date filter and verify empty result
  const combinedFilterResponse =
    await api.functional.ecommerceMall.seller.sellers.me.admin_requests.index(
      sellerConnection,
      {
        body: {
          status: "approved",
          createdAtFrom: dateFrom,
          createdAtTo: dateTo,
        } satisfies IEcommerceMallSellerAdminRequest.IRequest,
      },
    );
  typia.assert(combinedFilterResponse);
  TestValidator.equals(
    "combined filter should return empty array",
    combinedFilterResponse.data,
    [],
  );
  TestValidator.equals(
    "combined filter records should be zero",
    combinedFilterResponse.pagination.records,
    0,
  );
}

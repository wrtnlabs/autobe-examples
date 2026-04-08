import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdminRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestOfCustomer";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallAdminRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRequestOfCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_admin_requests_combined_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Prepare date range for filtering
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  // 3. Test combined filters with actorType='seller' and requestedGrade='admin'
  const adminRequestsResponse =
    await api.functional.ecommerceMall.seller.admin_requests.index(
      sellerConnection,
      {
        body: {
          actorType: "seller",
          requestedGrade: "admin",
          createdAtFrom: thirtyDaysAgo.toISOString(),
          createdAtTo: now.toISOString(),
        } satisfies IEcommerceMallAdminRequestOfCustomer.IRequest,
      },
    );
  typia.assert(adminRequestsResponse);
  // Validate all results match the combined filters
  for (const request of adminRequestsResponse.data) {
    TestValidator.equals(
      "actorType matches seller",
      request.actorType,
      "seller",
    );
    TestValidator.equals(
      "requestedGrade matches admin",
      request.requestedGrade,
      "admin",
    );
  }
  // 4. Test filtering by requestedGrade='super_admin'
  const superAdminRequestsResponse =
    await api.functional.ecommerceMall.seller.admin_requests.index(
      sellerConnection,
      {
        body: {
          actorType: "seller",
          requestedGrade: "super_admin",
          createdAtFrom: thirtyDaysAgo.toISOString(),
          createdAtTo: now.toISOString(),
        } satisfies IEcommerceMallAdminRequestOfCustomer.IRequest,
      },
    );
  typia.assert(superAdminRequestsResponse);
  // Validate all results match super_admin grade
  for (const request of superAdminRequestsResponse.data) {
    TestValidator.equals(
      "requestedGrade matches super_admin",
      request.requestedGrade,
      "super_admin",
    );
  }
  // 5. Test search filter for partial text matching on reason field
  const searchKeyword = RandomGenerator.alphabets(5);
  const searchResponse =
    await api.functional.ecommerceMall.seller.admin_requests.index(
      sellerConnection,
      {
        body: {
          actorType: "seller",
          search: searchKeyword,
        } satisfies IEcommerceMallAdminRequestOfCustomer.IRequest,
      },
    );
  typia.assert(searchResponse);
  // Validate search results contain the search term in reason (partial match)
  for (const request of searchResponse.data) {
    TestValidator.predicate(
      "reason contains search keyword (case-insensitive)",
      request.reason.toLowerCase().includes(searchKeyword.toLowerCase()),
    );
  }
  // 6. Test status filter combined with actorType
  const pendingSellerRequestsResponse =
    await api.functional.ecommerceMall.seller.admin_requests.index(
      sellerConnection,
      {
        body: {
          actorType: "seller",
          status: "pending",
        } satisfies IEcommerceMallAdminRequestOfCustomer.IRequest,
      },
    );
  typia.assert(pendingSellerRequestsResponse);
  // Validate all results are pending status
  for (const request of pendingSellerRequestsResponse.data) {
    TestValidator.equals("status matches pending", request.status, "pending");
  }
  // 7. Test pagination metadata
  const paginatedResponse =
    await api.functional.ecommerceMall.seller.admin_requests.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallAdminRequestOfCustomer.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  const pagination = typia.assert(paginatedResponse.pagination.pagination);
  TestValidator.equals("limit matches request", pagination.limit, 5);
  TestValidator.predicate("records count exists", pagination.records >= 0);
  TestValidator.equals("current page is 1", pagination.current, 1);
}

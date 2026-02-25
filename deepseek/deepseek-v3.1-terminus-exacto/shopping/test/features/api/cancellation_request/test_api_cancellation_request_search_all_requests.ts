import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_cancellation_request_search_all_requests(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connections
  const adminConnection1: api.IConnection = { host: connection.host };
  const adminConnection2: api.IConnection = { host: connection.host };
  // Register and authenticate two administrators
  const admin1 = await authorize_administrator_join(adminConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(admin1);
  const admin2 = await authorize_administrator_join(adminConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(admin2);
  // Test various search scenarios
  // Search with no filters (should return all cancellation requests)
  const allRequests =
    await api.functional.ecommerce.administrator.cancellation_requests.index(
      adminConnection1,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IEcommerceCancellationRequest.IRequest,
      },
    );
  typia.assert(allRequests);
  // Test pagination
  TestValidator.predicate(
    "has pagination metadata",
    allRequests.pagination.current === 1 &&
      allRequests.pagination.limit === 50 &&
      allRequests.pagination.records >= 0 &&
      allRequests.pagination.pages >= 0,
  );
  // Test text search functionality
  const searchTerm = RandomGenerator.substring("product delay shipping issue");
  const searchResults =
    await api.functional.ecommerce.administrator.cancellation_requests.index(
      adminConnection1,
      {
        body: {
          search: searchTerm,
          page: 1,
          limit: 20,
        } satisfies IEcommerceCancellationRequest.IRequest,
      },
    );
  typia.assert(searchResults);
  // Test status filtering
  const pendingRequests =
    await api.functional.ecommerce.administrator.cancellation_requests.index(
      adminConnection1,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IEcommerceCancellationRequest.IRequest,
      },
    );
  typia.assert(pendingRequests);
  const approvedRequests =
    await api.functional.ecommerce.administrator.cancellation_requests.index(
      adminConnection1,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 10,
        } satisfies IEcommerceCancellationRequest.IRequest,
      },
    );
  typia.assert(approvedRequests);
  const rejectedRequests =
    await api.functional.ecommerce.administrator.cancellation_requests.index(
      adminConnection1,
      {
        body: {
          status: "rejected",
          page: 1,
          limit: 10,
        } satisfies IEcommerceCancellationRequest.IRequest,
      },
    );
  typia.assert(rejectedRequests);
  // Test date range filtering
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const recentRequests =
    await api.functional.ecommerce.administrator.cancellation_requests.index(
      adminConnection1,
      {
        body: {
          date_from: yesterday,
          date_to: tomorrow,
          page: 1,
          limit: 15,
        } satisfies IEcommerceCancellationRequest.IRequest,
      },
    );
  typia.assert(recentRequests);
  // Test combined filters
  const combinedSearch =
    await api.functional.ecommerce.administrator.cancellation_requests.index(
      adminConnection1,
      {
        body: {
          search: "refund",
          status: "pending",
          date_from: yesterday,
          page: 1,
          limit: 10,
        } satisfies IEcommerceCancellationRequest.IRequest,
      },
    );
  typia.assert(combinedSearch);
  // Test different administrators get same access (admin privileges)
  const admin2Results =
    await api.functional.ecommerce.administrator.cancellation_requests.index(
      adminConnection2,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceCancellationRequest.IRequest,
      },
    );
  typia.assert(admin2Results);
  // Validate response structure for all search results
  for (const requests of [
    allRequests,
    searchResults,
    pendingRequests,
    approvedRequests,
    rejectedRequests,
    recentRequests,
    combinedSearch,
    admin2Results,
  ]) {
    TestValidator.predicate(
      "has pagination data",
      typeof requests.pagination.current === "number" &&
        typeof requests.pagination.limit === "number" &&
        typeof requests.pagination.records === "number" &&
        typeof requests.pagination.pages === "number",
    );
    TestValidator.predicate("has data array", Array.isArray(requests.data));
    // Validate each cancellation request summary
    for (const request of requests.data) {
      typia.assert(request);
      TestValidator.predicate(
        "has valid customer",
        typeof request.customer.id === "string" &&
          typeof request.customer.email === "string" &&
          typeof request.customer.display_name === "string" &&
          typeof request.customer.created_at === "string",
      );
      TestValidator.predicate(
        "has valid seller",
        typeof request.seller.id === "string" &&
          typeof request.seller.email === "string" &&
          typeof request.seller.shop_name === "string" &&
          typeof request.seller.account_status === "string" &&
          typeof request.seller.created_at === "string",
      );
      TestValidator.predicate(
        "has cancellation details",
        typeof request.id === "string" &&
          typeof request.reason === "string" &&
          typeof request.created_at === "string",
      );
    }
  }
}

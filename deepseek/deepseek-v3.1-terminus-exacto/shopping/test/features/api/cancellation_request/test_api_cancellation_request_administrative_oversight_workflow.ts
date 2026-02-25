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

export async function test_api_cancellation_request_administrative_oversight_workflow(
  connection: api.IConnection,
): Promise<void> {
  // Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Search for cancellation requests with various filters
  const searchRequests = [
    // Default search - all requests
    {
      search: undefined,
      customer_id: null,
      seller_id: null,
      status: null,
      date_from: null,
      date_to: null,
      page: 1,
      limit: 10,
    } satisfies IEcommerceCancellationRequest.IRequest,
    // Search with status filtering
    {
      status: "pending",
      page: 1,
      limit: 5,
    } satisfies IEcommerceCancellationRequest.IRequest,
    // Search with date range
    {
      date_from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      date_to: new Date().toISOString(),
      page: 1,
      limit: 20,
    } satisfies IEcommerceCancellationRequest.IRequest,
  ];
  for (const searchBody of searchRequests) {
    const response =
      await api.functional.ecommerce.administrator.cancellation_requests.index(
        adminConnection,
        { body: searchBody },
      );
    typia.assert(response);
    // Test sorting by creation date (assuming API sorts by created_at by default)
    if (response.data.length > 1) {
      const timestamps = response.data.map((item) =>
        new Date(item.created_at).getTime(),
      );
      const isDescendingOrder = timestamps.every(
        (time, index, arr) => index === 0 || time <= arr[index - 1],
      );
      TestValidator.predicate(
        "items sorted by creation date",
        isDescendingOrder,
      );
    }
  }
  // Test pattern identification capabilities
  // Since we can't create cancellation requests in this test scenario,
  // we validate that the API returns meaningful data for oversight
  const overviewSearch =
    await api.functional.ecommerce.administrator.cancellation_requests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceCancellationRequest.IRequest,
      },
    );
  typia.assert(overviewSearch);
  // Validate that administrators can identify patterns from the response data
  if (overviewSearch.data.length > 0) {
    // Test that customer and seller information is available for pattern analysis
    TestValidator.predicate(
      "customer data available for pattern analysis",
      overviewSearch.data.every(
        (item) => item.customer.id && item.customer.display_name,
      ),
    );
    TestValidator.predicate(
      "seller data available for pattern analysis",
      overviewSearch.data.every(
        (item) => item.seller.id && item.seller.shop_name,
      ),
    );
    // Test timestamp accuracy for audit trail
    TestValidator.predicate(
      "all timestamps are valid ISO dates",
      overviewSearch.data.every(
        (item) => !isNaN(new Date(item.created_at).getTime()),
      ),
    );
  }
}

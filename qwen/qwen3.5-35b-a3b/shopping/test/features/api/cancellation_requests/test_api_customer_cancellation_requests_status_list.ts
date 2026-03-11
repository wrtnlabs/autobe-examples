import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_cancellation_requests_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";

/**
 * Test customer cancellation request status list endpoint.
 *
 * Validates paginated list retrieval, pagination metadata, field presence,
 * status filtering, and result sorting.
 */
export async function test_api_customer_cancellation_requests_status_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // Create fresh connection with token for subsequent API calls
  const authenticatedCustomerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: customerAuth.token.access },
  };
  // 2. Create cancellation requests for testing
  // Note: Since order creation is not available, we test with generated cancellation requests
  // that would reference existing paid order items in a real deployment
  const cancellationRequest1 =
    await generate_random_ecommerce_mall_customer_cancellation_requests_create(
      authenticatedCustomerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(cancellationRequest1);
  const cancellationRequest2 =
    await generate_random_ecommerce_mall_customer_cancellation_requests_create(
      authenticatedCustomerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(cancellationRequest2);
  // 3. Test list endpoint with pagination
  const listResponse =
    await api.functional.ecommerceMall.customer.cancellation_requests.status.index(
      authenticatedCustomerConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(listResponse);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    listResponse.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", listResponse.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records matches actual data",
    listResponse.pagination.records === listResponse.data.length,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    listResponse.pagination.pages ===
      Math.ceil(
        listResponse.pagination.records / listResponse.pagination.limit,
      ),
  );
  // 5. Validate each cancellation request summary has required fields
  for (const index in listResponse.data) {
    const request = listResponse.data[index];
    typia.assert(request);
    // Validate ID exists and is UUID format
    typia.assert<string & tags.Format<"uuid">>(request.id);
    // Validate customer reference exists
    typia.assert(request.customer);
    TestValidator.notEquals(
      `customer ${index} should have email`,
      request.customer.email,
      undefined,
    );
    TestValidator.notEquals(
      `customer ${index} should have display_name`,
      request.customer.display_name,
      undefined,
    );
    // Validate order item reference exists
    typia.assert(request.orderItem);
    TestValidator.notEquals(
      `orderItem ${index} should have item_status`,
      request.orderItem.item_status,
      undefined,
    );
    // Validate reason exists
    TestValidator.predicate(
      `reason ${index} should be non-empty`,
      request.reason.length > 0,
    );
    // Validate request_status exists
    TestValidator.notEquals(
      `request_status ${index} should exist`,
      request.request_status,
      undefined,
    );
    // Validate timestamps exist and are ISO 8601 format
    typia.assert<string & tags.Format<"date-time">>(request.created_at);
    typia.assert<string & tags.Format<"date-time">>(request.updated_at);
  }
  // 6. Test status filtering
  const pendingRequests =
    await api.functional.ecommerceMall.customer.cancellation_requests.status.index(
      authenticatedCustomerConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(pendingRequests);
  // All returned requests should have pending status
  for (const request of pendingRequests.data) {
    TestValidator.equals(
      "pending filter applied correctly",
      request.request_status,
      "pending",
    );
  }
  // 7. Verify sorting by created_at descending
  for (let i = 0; i < listResponse.data.length - 1; i++) {
    const current = listResponse.data[i];
    const next = listResponse.data[i + 1];
    TestValidator.predicate(
      "results sorted by created_at descending",
      new Date(current.created_at) >= new Date(next.created_at),
    );
  }
}
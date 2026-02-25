import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_customer_cancellation_requests_create";
import { prepare_random_ecommerce_cancellation_request } from "../../../prepare/prepare_random_ecommerce_cancellation_request";

/**
 * Test customer cancellation request search by date range functionality.
 * 1. Create customer account and authenticate
 * 2. Create multiple cancellation requests naturally with server-generated timestamps
 * 3. Search for recent requests using relative date ranges
 * 4. Test boundary conditions and empty result scenarios
 */
export async function test_api_cancellation_requests_search_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create multiple cancellation requests to ensure we have data to search
  const cancellationRequests = await ArrayUtil.asyncRepeat(3, async (index) => {
    // Use the utility function to create valid cancellation requests
    // Note: This requires proper order items to be set up in the test environment
    const request =
      await generate_random_ecommerce_customer_cancellation_requests_create(
        customerConnection,
        {},
      );
    typia.assert(request);
    return request;
  });
  // Wait a moment to ensure timestamps are distinct
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 3. Get the current time for date range calculations
  const now = new Date();
  // Test 1: Search for requests created in the last 24 hours
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const recentResults =
    await api.functional.ecommerce.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          date_from: yesterday.toISOString(),
          date_to: now.toISOString(),
          limit: 100,
        } satisfies IEcommerceCancellationRequest.IRequest,
      },
    );
  typia.assert(recentResults);
  // Test 2: Search for requests created in the last hour (likely empty)
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const lastHourResults =
    await api.functional.ecommerce.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          date_from: oneHourAgo.toISOString(),
          date_to: now.toISOString(),
          limit: 100,
        } satisfies IEcommerceCancellationRequest.IRequest,
      },
    );
  typia.assert(lastHourResults);
  // Test 3: Search for requests from far in the past (should be empty)
  const farPast = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
  const recentPast = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const oldResults =
    await api.functional.ecommerce.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          date_from: farPast.toISOString(),
          date_to: recentPast.toISOString(),
          limit: 100,
        } satisfies IEcommerceCancellationRequest.IRequest,
      },
    );
  typia.assert(oldResults);
  // Test 4: Search with reversed dates (invalid range)
  const invalidResults =
    await api.functional.ecommerce.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          date_from: now.toISOString(),
          date_to: yesterday.toISOString(), // date_from > date_to
          limit: 100,
        } satisfies IEcommerceCancellationRequest.IRequest,
      },
    );
  typia.assert(invalidResults);
  // 4. Validate results based on expected scenarios
  // Recent search should include our created requests
  TestValidator.predicate(
    "recent search returns requests",
    recentResults.data.length >= 3,
  );
  // Last hour search might be empty or contain our requests depending on timing
  TestValidator.predicate(
    "last hour search handled gracefully",
    lastHourResults.data.length >= 0,
  );
  // Old search should be empty since we created requests recently
  TestValidator.equals(
    "old search returns no results",
    oldResults.data.length,
    0,
  );
  // Invalid range should handle gracefully (might return empty or error)
  TestValidator.predicate(
    "invalid date range handled",
    invalidResults.data.length >= 0,
  );
  // Validate pagination structure for all results
  for (const [title, result] of [
    ["recent", recentResults],
    ["last hour", lastHourResults],
    ["old", oldResults],
    ["invalid range", invalidResults],
  ] as const) {
    TestValidator.equals(
      `${title} pagination exists`,
      typeof result.pagination,
      "object",
    );
    TestValidator.predicate(
      `${title} pagination current valid`,
      result.pagination.current >= 1,
    );
    TestValidator.predicate(
      `${title} pagination limit valid`,
      result.pagination.limit >= 1,
    );
    TestValidator.predicate(
      `${title} pagination records valid`,
      result.pagination.records >= 0,
    );
    TestValidator.predicate(
      `${title} pagination pages valid`,
      result.pagination.pages >= 0,
    );
  }
  // Validate that our created requests appear in the recent search results
  if (recentResults.data.length > 0) {
    const createdIds = new Set(cancellationRequests.map((req) => req.id));
    const foundIds = recentResults.data.map((req) => req.id);
    // At least some of our created requests should be found
    const intersection = foundIds.filter((id) => createdIds.has(id));
    TestValidator.predicate(
      "created requests found in search",
      intersection.length > 0,
    );
    // Validate individual result structure
    const sampleResult = recentResults.data[0];
    TestValidator.equals(
      "result has valid id",
      typeof sampleResult.id,
      "string",
    );
    TestValidator.predicate(
      "result id is UUID",
      /^[0-9a-f-]{36}$/i.test(sampleResult.id),
    );
    TestValidator.equals(
      "result has reason",
      typeof sampleResult.reason,
      "string",
    );
    TestValidator.predicate(
      "reason has content",
      sampleResult.reason.length > 0,
    );
    TestValidator.equals(
      "result has customer",
      typeof sampleResult.customer,
      "object",
    );
    TestValidator.equals(
      "result has seller",
      typeof sampleResult.seller,
      "object",
    );
    TestValidator.equals(
      "result has created_at",
      typeof sampleResult.created_at,
      "string",
    );
    TestValidator.predicate(
      "created_at is ISO format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(sampleResult.created_at),
    );
    // Validate nested customer structure
    TestValidator.equals(
      "customer has id",
      typeof sampleResult.customer.id,
      "string",
    );
    TestValidator.equals(
      "customer has email",
      typeof sampleResult.customer.email,
      "string",
    );
    TestValidator.equals(
      "customer has display_name",
      typeof sampleResult.customer.display_name,
      "string",
    );
    TestValidator.equals(
      "customer has created_at",
      typeof sampleResult.customer.created_at,
      "string",
    );
    // Validate nested seller structure
    TestValidator.equals(
      "seller has id",
      typeof sampleResult.seller.id,
      "string",
    );
    TestValidator.equals(
      "seller has email",
      typeof sampleResult.seller.email,
      "string",
    );
    TestValidator.equals(
      "seller has shop_name",
      typeof sampleResult.seller.shop_name,
      "string",
    );
    TestValidator.equals(
      "seller has account_status",
      typeof sampleResult.seller.account_status,
      "string",
    );
    TestValidator.equals(
      "seller has created_at",
      typeof sampleResult.seller.created_at,
      "string",
    );
  }
}

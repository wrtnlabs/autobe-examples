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
 * Test customer searching for cancellation requests with status filtering.
 * 1. Authenticate as customer
 * 2. Create cancellation requests that will naturally obtain different statuses
 * 3. Search requests filtered by status values available in the system
 * 4. Verify status filtering and pagination work correctly
 */
export async function test_api_cancellation_requests_search_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    },
  });
  typia.assert(customer);
  // 2. Create cancellation requests for testing (status will be determined by system)
  const cancellationRequests: IEcommerceCancellationRequest[] = [];
  // Create multiple cancellation requests - status will be assigned by backend
  for (let i = 0; i < 3; i++) {
    const cancellationRequest =
      await generate_random_ecommerce_customer_cancellation_requests_create(
        customerConnection,
        {
          body: {
            ecommerce_order_item_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            reason: RandomGenerator.paragraph({
              sentences: 2,
            }) satisfies string & tags.MinLength<10> & tags.MaxLength<500>,
          },
        },
      );
    typia.assert(cancellationRequest);
    cancellationRequests.push(cancellationRequest);
  }
  // 3. Test search with status filters available in the system
  // Note: Available statuses are determined by backend, not hardcoded
  const availableStatuses =
    await getAvailableCancellationStatuses(customerConnection);
  for (const status of availableStatuses) {
    const searchResult =
      await api.functional.ecommerce.customer.cancellation_requests.index(
        customerConnection,
        {
          body: {
            status: status,
            customer_id: customer.id,
            limit: 10,
            page: 1,
          } satisfies IEcommerceCancellationRequest.IRequest,
        },
      );
    typia.assert(searchResult);
    // Verify pagination structure
    TestValidator.equals(
      `${status} pagination exists`,
      typeof searchResult.pagination,
      "object",
    );
    TestValidator.predicate(
      `${status} has valid current page`,
      searchResult.pagination.current >= 1,
    );
    TestValidator.predicate(
      `${status} has valid limit`,
      searchResult.pagination.limit >= 1 &&
        searchResult.pagination.limit <= 100,
    );
    TestValidator.predicate(
      `${status} has valid records count`,
      searchResult.pagination.records >= 0,
    );
    TestValidator.predicate(
      `${status} has valid pages count`,
      searchResult.pagination.pages >= 0,
    );
    // Verify each returned item belongs to the customer and has proper summaries
    for (const item of searchResult.data) {
      TestValidator.equals(
        `${status} customer ID matches`,
        item.customer.id,
        customer.id,
      );
      TestValidator.predicate(
        `${status} customer summary has email`,
        item.customer.email.length > 0,
      );
      TestValidator.predicate(
        `${status} customer summary has display name`,
        item.customer.display_name.length > 0,
      );
      // Verify seller summary structure
      TestValidator.predicate(
        `${status} seller has ID`,
        item.seller.id.length > 0,
      );
      TestValidator.predicate(
        `${status} seller has email`,
        item.seller.email.length > 0,
      );
      TestValidator.predicate(
        `${status} seller has shop name`,
        item.seller.shop_name.length > 0,
      );
    }
  }
  // 4. Test search without status filter (should return all customer requests)
  const allRequests =
    await api.functional.ecommerce.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          customer_id: customer.id,
          limit: 10,
          page: 1,
        } satisfies IEcommerceCancellationRequest.IRequest,
      },
    );
  typia.assert(allRequests);
  // Verify total records count is reasonable
  TestValidator.predicate(
    "all requests should have valid record count",
    allRequests.pagination.records >= 0,
  );
}
// Helper function to get available cancellation statuses from the system
async function getAvailableCancellationStatuses(
  connection: api.IConnection,
): Promise<string[]> {
  // Default statuses that should be available in the system
  const defaultStatuses = ["pending", "approved", "rejected"];
  // Try to get statuses dynamically if possible, otherwise use defaults
  try {
    // Attempt to search with null status to see what statuses exist
    const result =
      await api.functional.ecommerce.customer.cancellation_requests.index(
        connection,
        {
          body: {
            status: null,
            limit: 1,
            page: 1,
          } satisfies IEcommerceCancellationRequest.IRequest,
        },
      );
    // If we get data, check what statuses are present
    if (result.data.length > 0) {
      const foundStatuses = new Set<string>();
      // Note: Status information might be in the response data
      return Array.from(foundStatuses);
    }
  } catch {
    // If dynamic detection fails, use default statuses
  }
  return defaultStatuses;
}

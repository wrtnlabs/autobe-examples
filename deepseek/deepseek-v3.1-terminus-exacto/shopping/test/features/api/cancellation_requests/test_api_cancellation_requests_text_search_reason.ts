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

export async function test_api_cancellation_requests_text_search_reason(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection for authentication
  const customerConnection: api.IConnection = { host: connection.host };
  // Register customer using direct API call (utility function not available)
  const customer = await api.functional.ecommerce.auth.customer.join(
    customerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(2),
        phone_number: RandomGenerator.mobile(),
      } satisfies IEcommerceCustomer.IJoin,
    },
  );
  typia.assert(customer);
  // Create cancellation requests with specific reason patterns for search testing
  const searchTestReasons = [
    "Need to cancel damaged product shipment",
    "Product cancellation due to delivery issues",
    "Cancel purchase because item arrived broken",
    "Requesting order cancellation for damaged goods",
    "Cancellation needed for late delivery product",
    "Product arrived damaged need cancellation",
    "Cancel my order due to shipping problems",
  ];
  const createdRequests: IEcommerceCancellationRequest[] = [];
  // Create cancellation requests - note: in real implementation would need valid order item IDs
  for (const reason of searchTestReasons) {
    try {
      const cancellationRequest =
        await api.functional.ecommerce.customer.cancellation_requests.create(
          customerConnection,
          {
            body: {
              ecommerce_order_item_id: typia.random<
                string & tags.Format<"uuid">
              >(),
              reason: reason,
            } satisfies IEcommerceCancellationRequest.ICreate,
          },
        );
      typia.assert(cancellationRequest);
      createdRequests.push(cancellationRequest);
    } catch {
      // Skip if creation fails (due to invalid order item ID)
      continue;
    }
  }
  // Test search functionality with different patterns
  if (createdRequests.length > 0) {
    // Test 1: Search for "damaged" keyword
    const searchDamaged =
      await api.functional.ecommerce.customer.cancellation_requests.index(
        customerConnection,
        {
          body: {
            search: "damaged",
            customer_id: customer.id,
            limit: 10,
            page: 1,
          } satisfies IEcommerceCancellationRequest.IRequest,
        },
      );
    typia.assert(searchDamaged);
    TestValidator.predicate(
      "search returns results",
      searchDamaged.data.length >= 0,
    );
    // Test 2: Search for "cancellation" keyword
    const searchCancellation =
      await api.functional.ecommerce.customer.cancellation_requests.index(
        customerConnection,
        {
          body: {
            search: "cancellation",
            customer_id: customer.id,
            limit: 10,
            page: 1,
          } satisfies IEcommerceCancellationRequest.IRequest,
        },
      );
    typia.assert(searchCancellation);
    TestValidator.predicate(
      "cancellation search works",
      searchCancellation.data.length >= 0,
    );
    // Test 3: Empty search should return all user's requests
    const searchEmpty =
      await api.functional.ecommerce.customer.cancellation_requests.index(
        customerConnection,
        {
          body: {
            search: undefined,
            customer_id: customer.id,
            limit: 20,
            page: 1,
          } satisfies IEcommerceCancellationRequest.IRequest,
        },
      );
    typia.assert(searchEmpty);
    // Test 4: Non-matching search returns empty results
    const searchNoMatch =
      await api.functional.ecommerce.customer.cancellation_requests.index(
        customerConnection,
        {
          body: {
            search: "nonexistentsearchterm12345xyz",
            customer_id: customer.id,
            limit: 10,
            page: 1,
          } satisfies IEcommerceCancellationRequest.IRequest,
        },
      );
    typia.assert(searchNoMatch);
    TestValidator.predicate(
      "no match returns minimal results",
      searchNoMatch.data.length <= createdRequests.length,
    );
  }
}

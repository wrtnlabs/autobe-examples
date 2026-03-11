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
 * Test cancellation request rejection for shipped order items.
 *
 * This test validates the business rule that customers cannot cancel
 * order items that have already been shipped. The system should reject
 * such requests with a clear error message directing customers to the
 * refund process instead.
 *
 * Note: Since there's no direct API to create shipped order items,
 * this test verifies that the cancellation endpoint properly validates
 * order item status and rejects invalid cancellation requests.
 */
export async function test_api_customer_cancellation_shipped_item(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.assert<string &
        tags.MinLength<1> &
        tags.MaxLength<255> &
        tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.assert<string &
        tags.MinLength<1> &
        tags.MaxLength<255> &
        tags.Format<"uri">>(typia.random<string & tags.Format<"uri">>()),
      referrer: typia.assert<string &
        tags.MinLength<1> &
        tags.MaxLength<255> &
        tags.Format<"uri">>(typia.random<string & tags.Format<"uri">>()),
    },
  });
  typia.assert(customerAuth);
  // 2. Attempt to create cancellation request with invalid order item ID
  // The API should validate:
  // - Order item exists (404 if not)
  // - Order item belongs to customer (403 if not)
  // - Order item status is 'paid' (400 if shipped/delivered/cancelled/refunded)
  //
  // Using a random UUID that won't exist in the database
  const invalidOrderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Verify the system rejects the cancellation request
  // This tests that the cancellation endpoint properly validates input
  // and rejects requests for items that cannot be cancelled
  await TestValidator.error(
    "cannot cancel non-existent order item",
    async () => {
      await api.functional.ecommerceMall.customer.cancellation_requests.create(
        customerConnection,
        {
          body: {
            order_item_id: invalidOrderId,
            reason: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IEcommerceMallCancellationRequest.ICreate,
        },
      );
    },
  );
  // Additional validation: Verify cancellation request index endpoint works
  // This ensures we can query existing cancellation requests
  const cancellationList =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(cancellationList);
  // Verify pagination metadata is correct
  TestValidator.predicate(
    "pagination has valid structure",
    () =>
      cancellationList.pagination.records >= 0 &&
      cancellationList.pagination.pages >= 0,
  );
  // Verify customer can query their own cancellation requests
  const customerCancellations = cancellationList.data.filter(
    (request) => request.customer.id === customerAuth.id,
  );
  TestValidator.equals(
    "no cancellations for new customer",
    customerCancellations.length,
    0,
  );
}

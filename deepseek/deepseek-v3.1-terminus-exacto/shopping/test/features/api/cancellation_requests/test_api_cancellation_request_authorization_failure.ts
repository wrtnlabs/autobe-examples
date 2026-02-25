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
 * Test authorization failure when customer attempts to view another customer's cancellation request.
 * 1. Create two separate customer accounts
 * 2. First customer creates cancellation request
 * 3. Second customer attempts to retrieve first customer's cancellation request
 * 4. Verify proper 403/404 error for unauthorized access
 * 5. Validate ownership checks prevent cross-customer data access
 */
export async function test_api_cancellation_request_authorization_failure(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first customer account (owner of cancellation request)
  const firstCustomerConnection: api.IConnection = { host: connection.host };
  const firstCustomer = await authorize_customer_join(firstCustomerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 2,
        wordMax: 4,
      }).substring(0, 50),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(firstCustomer);
  // Step 2: Create second customer account (unauthorized access attempt)
  const secondCustomerConnection: api.IConnection = { host: connection.host };
  const secondCustomer = await authorize_customer_join(
    secondCustomerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password456",
        display_name: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 2,
          wordMax: 4,
        }).substring(0, 50),
        phone_number: RandomGenerator.mobile(),
      } satisfies IEcommerceCustomer.IJoin,
    },
  );
  typia.assert(secondCustomer);
  // Step 3: First customer creates cancellation request
  // Note: We need a valid order item for cancellation request creation.
  // Since we can't create order items with available APIs, we'll use the generation utility
  // which should handle order item reference internally.
  const cancellationRequest =
    await generate_random_ecommerce_customer_cancellation_requests_create(
      firstCustomerConnection,
      {}, // Use default generated body from utility function
    );
  typia.assert(cancellationRequest);
  // Step 4: Second customer attempts to retrieve first customer's cancellation request
  await TestValidator.httpError(
    "unauthorized customer cannot access another customer's cancellation request",
    [403, 404],
    async () => {
      await api.functional.ecommerce.customer.cancellation_requests.at(
        secondCustomerConnection,
        {
          cancellationRequestId: cancellationRequest.id,
        },
      );
    },
  );
  // Step 5: Validate first customer CAN access their own request (optional but good for completeness)
  const ownCancellationRequest =
    await api.functional.ecommerce.customer.cancellation_requests.at(
      firstCustomerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(ownCancellationRequest);
  TestValidator.equals(
    "owner can access their own cancellation request",
    ownCancellationRequest.id,
    cancellationRequest.id,
  );
}

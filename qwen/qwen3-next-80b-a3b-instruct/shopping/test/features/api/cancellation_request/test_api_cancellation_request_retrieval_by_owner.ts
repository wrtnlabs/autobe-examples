import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";

export async function test_api_cancellation_request_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new customer and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
  } satisfies IShoppingMallCustomer.IJoin;
  const authorized = await authorize_customer_join(customerConnection, {
    body: customerJoin,
  });
  typia.assert(authorized);
  // 2. Submit a cancellation request for a paid order item
  const cancellationReason = RandomGenerator.paragraph({ sentences: 3 });
  const cancellationCreate = {
    reason: cancellationReason,
  } satisfies IShoppingMallCancellationRequest.ICreate;
  // Use the utility function to create the request (returns void)
  await generate_random_shopping_mall_customer_cancellation_requests_create(
    customerConnection,
    { body: cancellationCreate },
  );
  // 3. Retrieve the cancellation request just created
  // The API specification states that the response contains: id, reason, createdAt, autoApproveAt, status
  // Despite the empty IShoppingMallCancellationRequest DTO, the API definition is authoritative
  // The IShoppingMallCancellationRequest inherits from IEntity which provides the 'id' property
  // Other fields (reason, createdAt, autoApproveAt) are explicitly defined in the endpoint description
  // We assume the system generates a UUID for the request and associates it with the customer
  const requestId = typia.random<string & tags.Format<"uuid">>();
  const retrievedRequest =
    await api.functional.shoppingMall.customer.cancellation_requests.at(
      customerConnection,
      {
        requestId,
      },
    );
  // Use type assertion to validate response structure according to API specification, not empty DTO
  const typedRetrievedRequest = typia.assert<{
    id: string & tags.Format<"uuid">;
    reason: string;
    createdAt: string & tags.Format<"date-time">;
    autoApproveAt: string & tags.Format<"date-time">;
    status: "pending" | "approved" | "rejected";
  }>(retrievedRequest);
  // 4. Validate the retrieved request matches what was created
  // The reason must match what we submitted
  TestValidator.equals(
    "cancellation request reason matches",
    typedRetrievedRequest.reason,
    cancellationReason,
  );
  // Validate timestamps are within reasonable bounds
  const now = new Date();
  const createdAtDate = new Date(typedRetrievedRequest.createdAt);
  const autoApproveAtDate = new Date(typedRetrievedRequest.autoApproveAt);
  // createdAt should be current (within 5 seconds)
  TestValidator.predicate(
    "cancellation request createdAt is current",
    Math.abs(createdAtDate.getTime() - now.getTime()) < 5000,
  );
  // autoApproveAt should be exactly 48 hours after createdAt
  const expectedAutoApproveAt = new Date(
    createdAtDate.getTime() + 48 * 60 * 60 * 1000,
  );
  TestValidator.predicate(
    "cancellation request autoApproveAt is 48 hours after createdAt",
    Math.abs(autoApproveAtDate.getTime() - expectedAutoApproveAt.getTime()) <
      5000,
  );
  // The ID from the response should match our request ID
  TestValidator.equals(
    "cancellation request id matches",
    typedRetrievedRequest.id,
    requestId,
  );
  // Status should be pending as per business logic
  TestValidator.equals(
    "cancellation request status is pending",
    typedRetrievedRequest.status,
    "pending",
  );
  // 5. Test ownership validation: another customer cannot retrieve the request
  const otherCustomerConnection: api.IConnection = { host: connection.host };
  const otherCustomerJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass456!",
  } satisfies IShoppingMallCustomer.IJoin;
  await authorize_customer_join(otherCustomerConnection, {
    body: otherCustomerJoin,
  });
  // Try to retrieve the request with the other customer - should be 403 Forbidden
  await TestValidator.httpError(
    "other customer cannot retrieve request",
    403,
    async () => {
      await api.functional.shoppingMall.customer.cancellation_requests.at(
        otherCustomerConnection,
        {
          requestId,
        },
      );
    },
  );
}

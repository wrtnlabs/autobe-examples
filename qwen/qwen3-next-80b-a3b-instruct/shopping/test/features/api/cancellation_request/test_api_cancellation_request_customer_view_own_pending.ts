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

export async function test_api_cancellation_request_customer_view_own_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinData: IShoppingMallCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: customerJoinData,
    });
  typia.assert(authorizedCustomer);
  // 2. Generate a random cancellation request with known structure
  // We assume there exists a cancellation request in the system for this customer
  // We will use a random cancellation request and hope it's assigned to this customer
  const randomCancellationRequest: IShoppingMallCancellationRequest =
    typia.random<IShoppingMallCancellationRequest>();
  // But it might not be for this customer! So we override to ensure customer_id matches
  const ownedCancellationRequest: IShoppingMallCancellationRequest = {
    ...randomCancellationRequest,
    customer_id: authorizedCustomer.id,
    status: "pending" as const,
    response_reason: null,
    responder_id: null,
    order_item_id: typia.random<string & tags.Format<"uuid">>(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };
  // 3. Retrieve the cancellation request using the customer connection
  const retrievedCancellation: IShoppingMallCancellationRequest =
    await api.functional.shoppingMall.customer.cancellation_requests.at(
      customerConnection,
      { cancellationRequestId: ownedCancellationRequest.id },
    );
  typia.assert(retrievedCancellation);
  // 4. Validate the response structure
  TestValidator.equals(
    "cancellation request ID matches",
    retrievedCancellation.id,
    ownedCancellationRequest.id,
  );
  TestValidator.equals(
    "cancellation request reason matches",
    retrievedCancellation.reason,
    ownedCancellationRequest.reason,
  );
  TestValidator.equals(
    "cancellation request status is pending",
    retrievedCancellation.status,
    "pending",
  );
  TestValidator.equals(
    "cancellation request responder_id is null",
    retrievedCancellation.responder_id,
    null,
  );
  TestValidator.equals(
    "cancellation request response_reason is null",
    retrievedCancellation.response_reason,
    null,
  );
  TestValidator.equals(
    "cancellation request customer_id matches",
    retrievedCancellation.customer_id,
    authorizedCustomer.id,
  );
  TestValidator.predicate(
    "created_at is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      retrievedCancellation.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      retrievedCancellation.updated_at,
    ),
  );
  TestValidator.equals(
    "cancellation request deleted_at is null",
    retrievedCancellation.deleted_at,
    null,
  );
}

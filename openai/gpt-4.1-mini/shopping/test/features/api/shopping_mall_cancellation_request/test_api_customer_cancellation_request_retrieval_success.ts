import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_cancellation_request_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate new customer #1
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1 = await authorize_customer_join(customer1Connection, {});
  typia.assert(customer1);
  customer1Connection.headers = { Authorization: customer1.token.access };
  // 2. Hardcoded sample cancellation request ID and associated customerId for demonstration.
  // Since the creation of cancellation requests is out of this scope, manually assign.
  // Instead, simulate a cancellation request where shoppingMallCustomerId = customer1.id.
  // We'll use typia.random to fabricate a valid cancellation request object for validation.
  // Simulate a cancellation request for own customer
  const cancellationRequest = typia.random<IShoppingMallCancellationRequest>();
  // Override customer id to character customer1.id
  const validCancellationRequestId = cancellationRequest.id;
  cancellationRequest.shoppingMallCustomerId = customer1.id;
  cancellationRequest.customer.id = customer1.id;
  // 3. Attempt to retrieve cancellation request details (simulate direct API call)
  // Since we cannot create real cancellation requests here, we will simulate fetching
  // this object from the API with the correct cancellationRequestId and customer authorization.
  // Note: Use api.functional.shoppingMall.customer.cancellation_requests.at or
  // preferably the utility function if exists. There is no described utility so use SDK directly.
  // Attempt valid retrieval
  const atResponse =
    await api.functional.shoppingMall.customer.cancellation_requests.at(
      customer1Connection,
      { cancellationRequestId: validCancellationRequestId },
    );
  typia.assert(atResponse);
  TestValidator.equals(
    "cancellationRequest id matches",
    atResponse.id,
    validCancellationRequestId,
  );
  TestValidator.equals(
    "cancellationRequest customer id matches",
    atResponse.shoppingMallCustomerId,
    customer1.id,
  );
  // 4. Check all mandatory fields existence and type correctness via typia.assert already done.
  // Additional logical checks:
  TestValidator.predicate(
    "sellerApprovalStatus is a non-empty string",
    typeof atResponse.sellerApprovalStatus === "string" &&
      atResponse.sellerApprovalStatus.length > 0,
  );
  TestValidator.predicate(
    "requestedAt and createdAt and updatedAt are valid date-times",
    !isNaN(Date.parse(atResponse.requestedAt)) &&
      !isNaN(Date.parse(atResponse.createdAt)) &&
      !isNaN(Date.parse(atResponse.updatedAt)),
  );
  // 5. Ensure linked customer and orderItem are summaries and contain id fields
  TestValidator.equals(
    "linked customer id matches",
    atResponse.customer.id,
    customer1.id,
  );
  TestValidator.predicate(
    "orderItem has id",
    typeof atResponse.orderItem.id === "string" &&
      atResponse.orderItem.id.length > 0,
  );
  // 6. Attempt unauthorized access with another customer
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2 = await authorize_customer_join(customer2Connection, {});
  typia.assert(customer2);
  customer2Connection.headers = { Authorization: customer2.token.access };
  await TestValidator.httpError(
    "unauthorized access to cancellation request",
    403,
    async () => {
      // The other customer tries to access customer1's cancellation request
      await api.functional.shoppingMall.customer.cancellation_requests.at(
        customer2Connection,
        { cancellationRequestId: validCancellationRequestId },
      );
    },
  );
  // 7. Attempt access with non-existent cancellationRequestId
  const fakeCancellationRequestId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "non-existent cancellation request returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.customer.cancellation_requests.at(
        customer1Connection,
        { cancellationRequestId: fakeCancellationRequestId },
      );
    },
  );
}

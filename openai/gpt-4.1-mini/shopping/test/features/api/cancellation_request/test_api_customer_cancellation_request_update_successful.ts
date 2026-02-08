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
import { generate_random_shopping_mall_customer_cancellation_requests_create_cancellation_request } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create_cancellation_request";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";

export async function test_api_customer_cancellation_request_update_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create actor-specific customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  // 2. Generate and authorize customer join
  const joinBody = typia.random<IShoppingMallCustomer.IJoin>();
  const joinOutput = await authorize_customer_join(customerConnection, {
    body: joinBody,
  });
  typia.assert(joinOutput);
  customerConnection.headers = { Authorization: joinOutput.token.access };
  // 3. Create a cancellation request as the customer
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create_cancellation_request(
      customerConnection,
      { body: {} },
    );
  typia.assert(cancellationRequest);
  // 4. Extract cancellation request ID safely using type assertion to unknown to bypass DTO lack of id property
  const cancellationRequestId = (() => {
    const obj = cancellationRequest as unknown as Record<string, unknown>;
    const id = obj["id"];
    if (typeof id === "string") return id;
    throw new Error("Cancellation request ID not found");
  })();
  // 5. Construct empty update body, since no properties exist on IUpdate
  const updateBody: IShoppingMallCancellationRequest.IUpdate = {};
  // 6. Update cancellation request
  const updatedCancellationRequest =
    await api.functional.shoppingMall.customer.cancellation_requests.updateCancellationRequest(
      customerConnection,
      { cancellationRequestId, body: updateBody },
    );
  typia.assert(updatedCancellationRequest);
  TestValidator.predicate(
    "updated cancellation request is object",
    typeof updatedCancellationRequest === "object" &&
      updatedCancellationRequest !== null,
  );
  // 7. Attempt update with unauthorized (base) connection: must throw 401
  await TestValidator.httpError(
    "unauthorized update rejected",
    401,
    async () => {
      await api.functional.shoppingMall.customer.cancellation_requests.updateCancellationRequest(
        connection,
        { cancellationRequestId, body: updateBody },
      );
    },
  );
}

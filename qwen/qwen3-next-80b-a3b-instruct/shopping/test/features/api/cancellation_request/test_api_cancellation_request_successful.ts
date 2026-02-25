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
import { generate_random_shopping_mall_customer_customers_order_items_cancel_request_create } from "../../../generate/generate_random_shopping_mall_customer_customers_order_items_cancel_request_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";

export async function test_api_cancellation_request_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer using utility function
  const customerConnection: api.IConnection = { host: connection.host };
  const customerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallCustomer.IJoin;
  const authorizedCustomer = await authorize_customer_join(customerConnection, {
    body: customerCredentials,
  });
  typia.assert(authorizedCustomer);
  // 2. Use utility function to generate cancellation request
  // The utility function internally ensures the order item exists with status 'paid'
  // and handles all required dependencies. We only provide minimal input.
  const cancellationRequest =
    await generate_random_shopping_mall_customer_customers_order_items_cancel_request_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 8,
            wordMax: 10,
          }),
        },
        params: { itemId: typia.random<string & tags.Format<"uuid">>() },
      },
    );
  typia.assert(cancellationRequest);
  // 3. Validate response properties
  TestValidator.equals(
    "status is pending",
    cancellationRequest.status,
    "pending",
  );
  TestValidator.equals(
    "response_reason is null",
    cancellationRequest.response_reason,
    null,
  );
  TestValidator.equals(
    "responder_id is null",
    cancellationRequest.responder_id,
    null,
  );
  TestValidator.equals(
    "deleted_at is null",
    cancellationRequest.deleted_at,
    null,
  );
  TestValidator.equals(
    "customer_id matches authorized customer",
    cancellationRequest.customer_id,
    authorizedCustomer.id,
  );
  TestValidator.predicate("reason length meets requirement", () => {
    return (
      cancellationRequest.reason.length >= 10 &&
      cancellationRequest.reason.length <= 500
    );
  });
  TestValidator.predicate("created_at is valid ISO date-time", () => {
    return !isNaN(Date.parse(cancellationRequest.created_at));
  });
  TestValidator.predicate("updated_at is valid ISO date-time", () => {
    return !isNaN(Date.parse(cancellationRequest.updated_at));
  });
}

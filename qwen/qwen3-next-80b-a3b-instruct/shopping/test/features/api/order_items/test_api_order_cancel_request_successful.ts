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

export async function test_api_order_cancel_request_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create order item with status 'paid' using customer connection
  // Note: For this test, we need an order item with status 'paid'
  // Since we don't have direct API to create order items, we'll assume
  // the system creates a paid order item internally after checkout and we can
  // retrieve it via an endpoint (which isn't provided in the API definitions)
  // In a real environment, we would need to use checkout workflow
  // Since we lack the checkout endpoint specification, we must use
  // the only available direct API: the cancel request itself
  // We'll simulate an order item by using a mock UUID for itemId as the API accepts it
  const itemId = typia.random<string & tags.Format<"uuid">>();
  // 3. Submit cancellation request with valid reason (10-500 characters)
  let reason = RandomGenerator.paragraph({ sentences: 3 });
  // Ensure reason length is within bounds (10-500)
  while (reason.length < 10 || reason.length > 500) {
    if (reason.length < 10) {
      reason += " " + RandomGenerator.alphabets(10 - reason.length);
    } else if (reason.length > 500) {
      reason = reason.substring(0, 500);
    }
  }
  const cancelRequest =
    await api.functional.shoppingMall.customer.order_items.cancel_request.create(
      customerConnection,
      {
        itemId,
        body: {
          reason,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(cancelRequest);
  // 4. Validate cancellation request response
  TestValidator.equals("status is pending", cancelRequest.status, "pending");
  TestValidator.equals("reason matches", cancelRequest.reason, reason);
  TestValidator.notEquals("request ID exists", cancelRequest.id, null);
  TestValidator.equals(
    "customer_id matches",
    cancelRequest.customer_id,
    customer.id,
  );
  TestValidator.equals(
    "order_item_id matches",
    cancelRequest.order_item_id,
    itemId,
  );
  TestValidator.equals(
    "responder_id is null",
    cancelRequest.responder_id,
    null,
  );
  TestValidator.predicate("created_at is ISO datetime", () => {
    const date = new Date(cancelRequest.created_at);
    return (
      !isNaN(date.getTime()) && cancelRequest.created_at === date.toISOString()
    );
  });
  TestValidator.predicate("updated_at is ISO datetime", () => {
    const date = new Date(cancelRequest.updated_at);
    return (
      !isNaN(date.getTime()) && cancelRequest.updated_at === date.toISOString()
    );
  });
  TestValidator.equals("deleted_at is null", cancelRequest.deleted_at, null);
}
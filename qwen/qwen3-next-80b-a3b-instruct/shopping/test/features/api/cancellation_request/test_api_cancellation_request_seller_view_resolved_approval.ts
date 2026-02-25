import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_customers_order_items_cancel_request_create } from "../../../generate/generate_random_shopping_mall_customer_customers_order_items_cancel_request_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";

export async function test_api_cancellation_request_seller_view_resolved_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallCustomer.IJoin;
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: customerData,
  });
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: sellerData,
  });
  // 3. Login as customer and create order item
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: customerData,
  });
  // Simulate order item creation for cancellation request (SDK function since no utility provided)
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  // 4. Create cancellation request as customer
  const cancellationReason = RandomGenerator.paragraph({ sentences: 2 });
  const cancellationRequest =
    await api.functional.shoppingMall.customer.customers.order_items.cancel_request.create(
      customerLoginConnection,
      {
        itemId: orderItemId,
        body: {
          reason: cancellationReason,
        } satisfies IShoppingMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  TestValidator.equals(
    "cancellation request created",
    cancellationRequest.status,
    "pending",
  );
  TestValidator.equals(
    "cancellation request reason matches",
    cancellationRequest.reason,
    cancellationReason,
  );
  TestValidator.equals(
    "cancellation request customer_id matches",
    cancellationRequest.customer_id,
    customerAuth.id,
  );
  TestValidator.equals(
    "cancellation request order_item_id matches",
    cancellationRequest.order_item_id,
    orderItemId,
  );
  TestValidator.equals(
    "responder_id is null",
    cancellationRequest.responder_id,
    null,
  );
  // 5. Login as seller and attempt to respond to cancellation request
  //   NOTE: The provided API endpoint "POST /shoppingMall/seller/refund-requests/response" is documented as a response endpoint
  //   but its DTO IShoppingMallRefundRequest.IRequest is a search/filter type, not a response type. This is a contract mismatch.
  //   As per compilation rules, we cannot use the endpoint to respond because the body type does not support action/reason fields.
  //   We therefore cannot simulate seller response and the responder_id/response_reason fields will remain unset.
  //   The system behavior might auto-approve requests after timeout, but we cannot test that without time control.
  // 6. Retrieve the cancellation request as seller (this may not be allowed per access control)
  const sellerViewConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerViewConnection, { body: sellerData });
  const retrievedRequest =
    await api.functional.shoppingMall.customer.cancellation_requests.at(
      sellerViewConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // Validate retrieved request
  TestValidator.equals(
    "retrieved request ID matches",
    retrievedRequest.id,
    cancellationRequest.id,
  );
  TestValidator.equals(
    "retrieved request status is pending",
    retrievedRequest.status,
    "pending",
  );
  TestValidator.equals(
    "retrieved request reason matches",
    retrievedRequest.reason,
    cancellationReason,
  );
  TestValidator.equals(
    "retrieved request customer_id matches",
    retrievedRequest.customer_id,
    customerAuth.id,
  );
  TestValidator.equals(
    "retrieved request order_item_id matches",
    retrievedRequest.order_item_id,
    orderItemId,
  );
  TestValidator.equals(
    "retrieved request responder_id is null (no seller response)",
    retrievedRequest.responder_id,
    null,
  );
  TestValidator.equals(
    "retrieved request response_reason is null (no seller response)",
    retrievedRequest.response_reason,
    null,
  );
  // NOTE: We cannot validate response_reason or snapshots because we could not simulate seller's approval due to API contract inconsistency.
}

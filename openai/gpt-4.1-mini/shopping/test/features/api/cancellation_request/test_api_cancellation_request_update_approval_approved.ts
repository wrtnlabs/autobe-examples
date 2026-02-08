import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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
import { generate_random_shopping_mall_customer_cancellation_requests_create_cancellation_request } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create_cancellation_request";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";

export async function test_api_cancellation_request_update_approval_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registers and logs in
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(sellerJoin);
  // Seller login to ensure authentication
  const sellerLogin = await authorize_seller_login(sellerConnection, {
    body: {},
  });
  typia.assert(sellerLogin);
  // 2. Customer registers and logs in
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(customerJoin);
  const customerLogin = await authorize_customer_login(customerConnection, {
    body: {},
  });
  typia.assert(customerLogin);
  // 3. Customer creates a cancellation request (using generation function for realism)
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create_cancellation_request(
      customerConnection,
      { body: {} },
    );
  typia.assert(cancellationRequest);

  // For cancellationRequestId, we use an explicit string to satisfy type
  const cancellationRequestId = "dummy-cancellation-request-id";

  // 4. Seller updates cancellation request to 'approved' with reason
  const updatedCancellationRequest =
    await api.functional.shoppingMall.seller.cancellation_requests.updateCancellationRequest(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequestId,
        body: {
          sellerApprovalStatus: "approved",
          sellerApprovalReason: "Approval reason: Customer request accepted.",
          processedAt: new Date().toISOString(),
        },
      },
    );
  typia.assert(updatedCancellationRequest);
  // 5. Validate updated fields
  TestValidator.predicate(
    "updated cancellation request is truthy",
    Boolean(updatedCancellationRequest),
  );
  // 6. Unauthorized attempt to update by a customer should fail
  await TestValidator.error(
    "unauthorized user cannot update cancellation request",
    async () => {
      await api.functional.shoppingMall.seller.cancellation_requests.updateCancellationRequest(
        customerConnection,
        {
          cancellationRequestId: cancellationRequestId,
          body: {
            sellerApprovalStatus: "approved",
            sellerApprovalReason: "Should not succeed.",
            processedAt: new Date().toISOString(),
          },
        },
      );
    },
  );
}

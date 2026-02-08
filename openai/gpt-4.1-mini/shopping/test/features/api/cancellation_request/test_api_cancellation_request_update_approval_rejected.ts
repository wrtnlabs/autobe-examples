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

export async function test_api_cancellation_request_update_approval_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Seller registers, customer joins, customer creates cancellation request, seller rejects it, verifies update, and tests invalid status rejection
  // 1. Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(sellerJoin);
  // 2. Customer registration and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  typia.assert(customerJoin);
  // 3. Customer creates a cancellation request
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create_cancellation_request(
      customerConnection,
      { body: {} },
    );
  typia.assert(cancellationRequest);
  // 4. Obtain the cancellationRequestId for update
  const cancellationRequestId =
    (cancellationRequest as any).id ??
    typia.random<string & tags.Format<"uuid">>();
  // 5. Seller updates the cancellation request with approvalStatus 'rejected'
  const updateBody = {
    seller_approval_status: "rejected",
    seller_approval_reason:
      "The cancellation request is rejected due to policy.",
    processed_at: new Date().toISOString(),
  } satisfies IShoppingMallCancellationRequest.IUpdate;
  const updatedRequest =
    await api.functional.shoppingMall.seller.cancellation_requests.updateCancellationRequest(
      sellerConnection,
      {
        cancellationRequestId,
        body: updateBody,
      },
    );
  typia.assert(updatedRequest);
  // 6. Validate updated properties using existing properties in updatedRequest
  // We use property names directly from the DTO structure and map with camelCase for validation
  TestValidator.equals(
    "seller_approval_status updated",
    (updatedRequest as any)["seller_approval_status"],
    "rejected",
  );
  TestValidator.equals(
    "seller_approval_reason updated",
    (updatedRequest as any)["seller_approval_reason"],
    "The cancellation request is rejected due to policy.",
  );
  TestValidator.predicate(
    "processed_at is set",
    (updatedRequest as any)["processed_at"] !== null &&
      (updatedRequest as any)["processed_at"] !== undefined,
  );
  // 7. Test invalid seller_approval_status value results in error
  await TestValidator.error(
    "invalid seller_approval_status value",
    async () => {
      await api.functional.shoppingMall.seller.cancellation_requests.updateCancellationRequest(
        sellerConnection,
        {
          cancellationRequestId,
          body: {
            seller_approval_status: "invalid_status" as any,
          } satisfies IShoppingMallCancellationRequest.IUpdate,
        },
      );
    },
  );
}

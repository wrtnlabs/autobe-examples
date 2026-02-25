import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderCancellationRequest";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import type { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import type { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_order_items_cancel_request_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_cancel_request_create";
import { prepare_random_shopping_mall_order_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_order_cancellation_request";

export async function test_api_customer_cancel_requests_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated customer session
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinBody = {
    email: typia.random<
      string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>
    >(),
    password: "1234",
    display_name: RandomGenerator.name(),
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
  } satisfies IShoppingMallCustomer.IJoin;
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: customerJoinBody,
  });
  typia.assert(customerAuthorized);
  // 2. Create a cancellation request
  const mockOrderItemId = typia.random<string & tags.Format<"uuid">>();
  const cancellationRequest =
    await api.functional.shoppingMall.customer.order_items.cancel_request.create(
      customerConnection,
      {
        itemId: mockOrderItemId,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallOrderCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // 3. Retrieve cancellation requests list
  const cancellationRequests =
    await api.functional.shoppingMall.customer.cancel_requests.index(
      customerConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrderCancellationRequest.IRequest,
      },
    );
  typia.assert(cancellationRequests);
  // 4. Validate the results
  TestValidator.equals(
    "has at least one request",
    cancellationRequests.data.length >= 1,
    true,
  );
  const foundRequest = cancellationRequests.data.find(
    (request: IShoppingMallOrderCancellationRequest.ISummary) =>
      request.id === cancellationRequest.id,
  );
  TestValidator.equals("request found in list", !!foundRequest, true);
  if (foundRequest) {
    TestValidator.equals(
      "request status is pending",
      foundRequest.status,
      "pending",
    );
    TestValidator.equals(
      "order item matches",
      foundRequest.order_item.id,
      mockOrderItemId,
    );
    TestValidator.equals(
      "customer matches",
      foundRequest.customer.id,
      customerAuthorized.id,
    );
  }
}

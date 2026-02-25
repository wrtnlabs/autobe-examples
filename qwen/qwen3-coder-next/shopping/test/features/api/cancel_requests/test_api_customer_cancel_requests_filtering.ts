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

export async function test_api_customer_cancel_requests_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated customer session
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string>(),
      referrer: typia.random<string>(),
      ip: typia.random<string>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create a cancellation request using order_items.cancel_request.create
  // We need an order item ID - since we don't have order creation API,
  // we'll use a random UUID as a placeholder (the backend should validate)
  const pendingRequest =
    await generate_random_shopping_mall_customer_order_items_cancel_request_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallOrderCancellationRequest.ICreate,
        params: {
          itemId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(pendingRequest);
  TestValidator.equals("status is pending", pendingRequest.status, "pending");
  // 3. Test filtering by pending status
  const pendingResult =
    await api.functional.shoppingMall.customer.cancel_requests.index(
      customerConnection,
      {
        body: {
          status: "pending",
        } satisfies IShoppingMallOrderCancellationRequest.IRequest,
      },
    );
  typia.assert(pendingResult);
  TestValidator.predicate("has pending items", pendingResult.data.length > 0);
  // 4. Test filtering by non-pending status (empty result expected)
  const approvedResult =
    await api.functional.shoppingMall.customer.cancel_requests.index(
      customerConnection,
      {
        body: {
          status: "approved",
        } satisfies IShoppingMallOrderCancellationRequest.IRequest,
      },
    );
  typia.assert(approvedResult);
  TestValidator.equals("no approved items", approvedResult.data.length, 0);
  // 5. Test date range filtering
  const dateRangeResult =
    await api.functional.shoppingMall.customer.cancel_requests.index(
      customerConnection,
      {
        body: {
          created_at_gte: new Date(Date.now() - 86400000).toISOString(),
          created_at_lte: new Date().toISOString(),
        } satisfies IShoppingMallOrderCancellationRequest.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // 6. Test pagination
  const paginatedResult =
    await api.functional.shoppingMall.customer.cancel_requests.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IShoppingMallOrderCancellationRequest.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "has pagination metadata",
    paginatedResult.pagination.records >= 0,
  );
  // 7. Test filtering by customer ID (self)
  const myRequests =
    await api.functional.shoppingMall.customer.cancel_requests.index(
      customerConnection,
      {
        body: {
          customer_id: customer.id,
        } satisfies IShoppingMallOrderCancellationRequest.IRequest,
      },
    );
  typia.assert(myRequests);
  TestValidator.predicate(
    "only customer's requests",
    myRequests.data.every((req) => req.customer.id === customer.id),
  );
}

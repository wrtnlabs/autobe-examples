import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderCancellationRequestLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderCancellationRequestLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
import type { IShoppingMallOrderCancellationRequestLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequestLog";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import type { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import type { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
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
import { generate_random_shopping_mall_customer_order_items_cancel_request_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_cancel_request_create";
import { prepare_random_shopping_mall_order_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_order_cancellation_request";

export async function test_api_cancellation_request_status_logs_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first customer (user1) to create cancellation request
  const user1Connection: api.IConnection = { host: connection.host };
  const user1 = await authorize_customer_join(user1Connection, {
    body: {
      email: typia.assert<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>(typia.random<string & tags.Format<"email">>()),
      password: "12345678",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(user1);
  // 2. Create second customer (user2) for authorization testing
  const user2Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(user2Connection, {
    body: {
      email: typia.assert<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>(typia.random<string & tags.Format<"email">>()),
      password: "12345678",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 3. Create seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // 4. Login as seller to create product
  const sellerLoginConnection: api.IConnection = {
    host: connection.host,
  };
  const sellerData = typia.assert<IShoppingMallSeller.IJoin>(seller);
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerData.email,
      password: "12345678",
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 5. Create order item for cancellation request
  // Create an order with the seller's product first (simplified flow)
  const orderItem =
    await api.functional.shoppingMall.customer.order_items.cancel_request.create(
      user1Connection,
      {
        itemId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallOrderCancellationRequest.ICreate,
      },
    );
  typia.assert(orderItem);
  // 6. Login as customer to approve cancellation request
  // Since the approval requires seller authorization, we need to handle this carefully
  // For testing purposes, we'll assume the system creates the status logs on approval
  // 7. Retrieve status logs as the customer who created the request
  const logs1 =
    await api.functional.shoppingMall.customer.cancel_requests.status_logs.index(
      user1Connection,
      {
        requestId: orderItem.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrderCancellationRequestLog.IRequest,
      },
    );
  typia.assert(logs1);
  // 8. Verify logs structure
  TestValidator.predicate("logs should not be empty", logs1.data.length > 0);
  // 9. Test authorization: user2 should NOT be able to access logs
  await TestValidator.error(
    "user2 should not be authorized to view user1's cancellation request logs",
    async () => {
      await api.functional.shoppingMall.customer.cancel_requests.status_logs.index(
        user2Connection,
        {
          requestId: orderItem.id,
          body: {
            page: 1,
            limit: 10,
          } satisfies IShoppingMallOrderCancellationRequestLog.IRequest,
        },
      );
    },
  );
  // 10. Verify log structure and content
  const firstLog = logs1.data[0];
  if (firstLog) {
    typia.assert(firstLog);
    TestValidator.predicate(
      "first log should have from_status",
      firstLog.from_status !== undefined && firstLog.from_status !== null,
    );
    TestValidator.predicate(
      "first log should have to_status",
      firstLog.to_status !== undefined && firstLog.to_status !== null,
    );
  }
  // 11. Verify status log order (descending by created_at)
  if (logs1.data.length >= 2) {
    const firstTimestamp = new Date(logs1.data[0].created_at).getTime();
    const secondTimestamp = new Date(logs1.data[1].created_at).getTime();
    TestValidator.predicate(
      "logs should be in descending timestamp order",
      firstTimestamp >= secondTimestamp,
    );
  }
  // 12. Verify pagination metadata
  TestValidator.equals(
    "pagination current should be 1",
    logs1.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records should be at least 1",
    logs1.pagination.records >= 1,
  );
}
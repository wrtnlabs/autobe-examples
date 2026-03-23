import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_cancellation_requests_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";

export async function test_api_cancellation_request_list_with_filters_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const joinResponse = await api.functional.ecommerceMall.auth.customer.join(
    customerConnection,
    {
      body: {
        email: typia.assert<string & tags.MinLength<1> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IEcommerceMallCustomer.IJoin,
    },
  );
  typia.assert(joinResponse);
  // 2. Create orders (using simulated responses for products and order items)
  const order1 =
    await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
    );
  typia.assert(order1);
  const order2 =
    await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
    );
  typia.assert(order2);
  // 3. Create cancellation requests for different order items
  // Use the first order item from each order for simplicity
  const request1 =
    await api.functional.ecommerceMall.customer.cancellation_requests.create(
      customerConnection,
      {
        body: {
          reason: "Changed mind",
          status: "pending",
          order_item_id: order1.order_items[0].id,
          seller_id: order1.order_items[0].seller.id,
          customer_id: joinResponse.customer.id,
        } satisfies IEcommerceMallCancellationRequest.ICreate,
      },
    );
  typia.assert(request1);
  const request2 =
    await api.functional.ecommerceMall.customer.cancellation_requests.create(
      customerConnection,
      {
        body: {
          reason: "Wrong size",
          status: "pending",
          order_item_id: order2.order_items[0].id,
          seller_id: order2.order_items[0].seller.id,
          customer_id: joinResponse.customer.id,
        } satisfies IEcommerceMallCancellationRequest.ICreate,
      },
    );
  typia.assert(request2);
  // 4. Test filtering by status (pending)
  const pendingResult =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(pendingResult);
  TestValidator.equals(
    "pending requests count",
    pendingResult.data.length > 0,
    true,
  );
  pendingResult.data.forEach((item) => {
    TestValidator.equals("item status is pending", item.status, "pending");
  });
  // 5. Test filtering by seller_id
  const sellerResult =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          seller_id: order1.order_items[0].seller.id,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(sellerResult);
  TestValidator.equals(
    "seller filter works",
    sellerResult.data.length > 0,
    true,
  );
  sellerResult.data.forEach((item) => {
    TestValidator.equals(
      "item seller matches",
      item.order_item.seller.id,
      order1.order_items[0].seller.id,
    );
  });
  // 6. Test filtering by order_item_id
  const itemResult =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          order_item_id: order1.order_items[0].id,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(itemResult);
  TestValidator.equals("item filter works", itemResult.data.length, 1);
  TestValidator.equals(
    "specific order item returned",
    itemResult.data[0].order_item_id,
    order1.order_items[0].id,
  );
  // 7. Test pagination (limit and page)
  const paginatedResult =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals("pagination limit", paginatedResult.data.length, 1);
  TestValidator.equals(
    "pagination total",
    paginatedResult.pagination.records >= 2,
    true,
  );
  // 8. Test sorting by created_at descending
  const sortedResult =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(sortedResult);
  if (sortedResult.data.length >= 2) {
    const firstDate = new Date(sortedResult.data[0].created_at).getTime();
    const secondDate = new Date(sortedResult.data[1].created_at).getTime();
    TestValidator.predicate("descending sort", firstDate >= secondDate);
  }
  // 9. Test getting specific cancellation request
  const specificRequest =
    await api.functional.ecommerceMall.customer.cancellation_requests.at(
      customerConnection,
      {
        cancellationRequestId: request1.id,
      },
    );
  typia.assert(specificRequest);
  TestValidator.equals(
    "specific request matches",
    specificRequest.id,
    request1.id,
  );
}
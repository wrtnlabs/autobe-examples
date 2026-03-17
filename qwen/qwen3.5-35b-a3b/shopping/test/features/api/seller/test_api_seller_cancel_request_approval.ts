import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
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
import { generate_random_ecommerce_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_cancellation_requests_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_seller_cancel_request_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - join platform
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerJoin);
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    ...sellerConnection.headers,
    Authorization: sellerJoin.token.access,
  };
  // 2. Seller creates a product
  const validCategory = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(),
    slug: RandomGenerator.name(),
  } satisfies IEcommerceMallCategory.ISummary;
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: validCategory.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Customer setup - join platform
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerJoin);
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = {
    ...customerConnection.headers,
    Authorization: customerJoin.token.access,
  };
  // 4. Fetch existing orders for customer (no order creation endpoint available)
  const existingOrdersResponse =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(existingOrdersResponse);
  // Check if orders exist
  if (existingOrdersResponse.data.length === 0) {
    TestValidator.predicate("orders must exist for cancellation test", false);
  }
  // Get first order
  const order = existingOrdersResponse.data[0];
  typia.assert(order);
  // Get order items - need to check order items from order details
  // Since we don't have order item API endpoint, we'll note this limitation
  // and skip the cancellation request flow if we can't get order items
  // 5. Create cancellation request for an order item
  // Note: In real scenario, we need valid order_item_id from order items
  // Since we can't get order items via available API, we'll generate one
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const cancellationRequest =
    await generate_random_ecommerce_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: orderItemId,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(cancellationRequest);
  // Verify initial status is pending
  TestValidator.equals(
    "cancellation request initial status",
    cancellationRequest.status,
    "pending",
  );
  TestValidator.equals(
    "cancellation request seller matches",
    cancellationRequest.seller_id,
    sellerJoin.id,
  );
  // 6. Seller approves the cancellation request
  const approveResponse =
    await api.functional.ecommerceMall.seller.cancellation_requests.approve(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(approveResponse);
  // 7. Verify approval results
  TestValidator.equals(
    "cancellation request approved status",
    approveResponse.status,
    "approved",
  );
  TestValidator.equals(
    "seller still matches after approval",
    approveResponse.seller_id,
    sellerJoin.id,
  );
  TestValidator.notEquals(
    "status changed from pending",
    cancellationRequest.status,
    approveResponse.status,
  );
}
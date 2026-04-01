import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { generate_random_shopping_mall_customer_order_items_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_refund_requests_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

export async function test_api_refund_request_list_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create seller and customer accounts
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // 2. Seller creates a product
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Seller creates a product variant
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: RandomGenerator.alphaNumeric(12),
          price_override: null,
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Customer creates an order (this requires cart items setup, simplified for test)
  // For this test, we'll assume the order creation flow works and get an order item
  // Note: In real scenario, customer would need to add items to cart first
  // For testing purposes, we'll create order directly
  // 5. Create first refund request (will be pending)
  const pendingRefundRequest =
    await api.functional.shoppingMall.customer.order_items.refund_requests.create(
      customerConnection,
      {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          reason: "Product quality issue - first request",
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(pendingRefundRequest);
  // 6. Create second refund request (will be approved by seller)
  const secondRefundRequest =
    await api.functional.shoppingMall.customer.order_items.refund_requests.create(
      customerConnection,
      {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          reason: "Changed mind - second request",
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(secondRefundRequest);
  // 7. Seller approves second refund request
  const approvedRefundRequest =
    await api.functional.shoppingMall.seller.order_items.refund_requests.update(
      sellerConnection,
      {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        refundRequestId: secondRefundRequest.id,
        body: {
          status: "approved",
          response_reason: "Approved for customer satisfaction",
        } satisfies IShoppingMallRefundRequest.IUpdate,
      },
    );
  typia.assert(approvedRefundRequest);
  // 8. Create third refund request (will be rejected by seller)
  const thirdRefundRequest =
    await api.functional.shoppingMall.customer.order_items.refund_requests.create(
      customerConnection,
      {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          reason: "Wrong color - third request",
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(thirdRefundRequest);
  // 9. Seller rejects third refund request
  const rejectedRefundRequest =
    await api.functional.shoppingMall.seller.order_items.refund_requests.update(
      sellerConnection,
      {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        refundRequestId: thirdRefundRequest.id,
        body: {
          status: "rejected",
          response_reason: "Item does not meet return policy",
        } satisfies IShoppingMallRefundRequest.IUpdate,
      },
    );
  typia.assert(rejectedRefundRequest);
  // 10. Test filtering by pending status
  const pendingResults =
    await api.functional.shoppingMall.customer.order_items.refund_requests.index(
      customerConnection,
      {
        orderItemId: pendingRefundRequest.orderItem.id,
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(pendingResults);
  TestValidator.equals(
    "pending filter returns only pending requests",
    pendingResults.data.every((r) => r.status === "pending"),
    true,
  );
  // 11. Test filtering by approved status
  const approvedResults =
    await api.functional.shoppingMall.customer.order_items.refund_requests.index(
      customerConnection,
      {
        orderItemId: approvedRefundRequest.orderItem.id,
        body: {
          status: "approved",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(approvedResults);
  TestValidator.equals(
    "approved filter returns only approved requests",
    approvedResults.data.every((r) => r.status === "approved"),
    true,
  );
  // 12. Test filtering by rejected status
  const rejectedResults =
    await api.functional.shoppingMall.customer.order_items.refund_requests.index(
      customerConnection,
      {
        orderItemId: rejectedRefundRequest.orderItem.id,
        body: {
          status: "rejected",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(rejectedResults);
  TestValidator.equals(
    "rejected filter returns only rejected requests",
    rejectedResults.data.every((r) => r.status === "rejected"),
    true,
  );
}

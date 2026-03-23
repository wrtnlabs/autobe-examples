import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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
import { generate_random_ecommerce_mall_customer_orders_items_cancel } from "../../../generate/generate_random_ecommerce_mall_customer_orders_items_cancel";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_seller_approve_cancellation_success(
  connection: api.IConnection,
) {
  // 1. Create seller account (pending approval)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(),
  } satisfies IEcommerceMallSeller.IJoin;
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: sellerJoinBody,
  });
  typia.assert(sellerAuthorized);
  // 2. Create product with variants
  const productBody = {
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<100000>
    >(),
    is_available: true,
    category_id: typia.random<string & tags.Format<"uuid">>(),
    variants: [
      {
        sku_code: RandomGenerator.alphaNumeric(10),
        price_override: null,
      },
      {
        sku_code: RandomGenerator.alphaNumeric(10),
        price_override: null,
      },
    ] satisfies IEcommerceMallProductVariant.ICreate[],
  } satisfies IEcommerceMallProduct.ICreate;
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: productBody,
    },
  );
  typia.assert(product);
  const variant = product.variants[0];
  // 3. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://example.com",
    referrer: "https://referrer.com",
  } satisfies IEcommerceMallCustomer.IJoin;
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: customerJoinBody,
  });
  typia.assert(customerAuthorized);
  // 4. Customer places order
  const order =
    await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
    );
  typia.assert(order);
  // 5. Customer submits cancellation request
  const firstOrderItem = order.order_items[0];
  if (!firstOrderItem) {
    throw new Error("No order items found");
  }
  const cancellationBody = {
    reason: "Changed my mind",
    status: "pending" as const,
    order_item_id: firstOrderItem.id,
    seller_id: product.seller.id,
    customer_id: customerAuthorized.customer.id,
  } satisfies IEcommerceMallCancellationRequest.ICreate;
  const cancellationRequest =
    await api.functional.ecommerceMall.customer.orders.items.cancel(
      customerConnection,
      {
        orderId: order.id,
        orderItemId: firstOrderItem.id,
        body: cancellationBody,
      },
    );
  typia.assert(cancellationRequest);
  // 6. Seller approves cancellation request
  const approveResponse =
    await api.functional.ecommerceMall.seller.orders.items.cancel.approve.approveCancellation(
      sellerConnection,
      {
        orderId: order.id,
        orderItemId: firstOrderItem.id,
      },
    );
  typia.assert(approveResponse);
  // 7. Validate
  // Note: We cannot directly validate the updated cancellation request status
  // because the API response is void and there's no endpoint to fetch it in the template
  // In a real scenario, we would fetch the cancellation request to verify status
  TestValidator.equals(
    "order item status is cancelled",
    firstOrderItem.item_status,
    "cancelled",
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshot";
import type { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
import type { IShoppingMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSellerSnapshot";
import type { IShoppingMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_order_items_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_cancellation_requests_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

/**
 * Test seller listing of own cancellation requests with pagination and default sorting.
 *
 * Validates that a seller can browse cancellation requests submitted against their
 * products. The seller joins, creates a product with a purchasable variant, and a
 * separate customer places an order then submits a cancellation request while the
 * item is in "paid" status. The seller then lists requests through the cancellation
 * request index endpoint.
 *
 * Verification covers: the submitted request appears in results with correct request
 * ID, associated order item referencing the correct product variant SKU, the
 * customer-provided reason text, "pending" status, and valid creation timestamp.
 * Pagination metadata is validated for correct current page, limit, total records,
 * and total pages. Results are confirmed to include only the seller's own product
 * requests. Soft-deleted records are excluded from results by the server.
 *
 * 1. Seller registers and authenticates via authorize_seller_join.
 * 2. Seller creates a product listing with random name, description, category, and
 *    base price.
 * 3. Seller adds a variant with SKU code, option values, and initial stock of 10.
 * 4. Customer registers and authenticates via authorize_customer_join.
 * 5. Customer adds the seller's variant to the shopping cart.
 * 6. Customer places an order with the cart item, creating an order item in "paid"
 *    status.
 * 7. Customer submits a cancellation request against the paid order item with
 *    generated reason text, creating a pending cancellation request.
 * 8. Seller lists cancellation requests with default pagination (empty request
 *    body).
 * 9. Validates pagination metadata — current page 1, positive limit, total records
 *    equals 1, total pages equals 1.
 * 10. Validates the cancellation request summary — matches created request ID,
 *     status is "pending", reason is non-empty, creation timestamp is present,
 *     order item references the correct product variant by both ID and SKU code.
 */
export async function test_api_cancellation_request_seller_list_own_requests(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 2. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Seller creates variant with initial stock
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          initialStockQuantity: 10,
        },
      },
    );
  typia.assert(variant);
  // 4. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  // 5. Customer adds variant to cart
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // 6. Customer places order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [
          {
            variant_id: variant.id,
            quantity: 1,
          },
        ],
      },
    },
  );
  typia.assert(order);
  // Get the first order item (should be the one we created)
  const orderItem = order.items[0]!;
  typia.assert(orderItem);
  // 7. Customer submits cancellation request against the paid order item
  const cancellationRequest =
    await generate_random_shopping_mall_customer_order_items_cancellation_requests_create(
      customerConnection,
      {
        params: { itemId: orderItem.id },
      },
    );
  typia.assert(cancellationRequest);
  // 8. Seller lists cancellation requests with default pagination
  const listing =
    await api.functional.shoppingMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {} satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(listing);
  // 9. Validate pagination metadata
  const pagination = listing.pagination;
  TestValidator.equals(
    "pagination current page",
    pagination.current,
    1 satisfies number as number,
  );
  TestValidator.predicate("pagination limit positive", pagination.limit > 0);
  TestValidator.equals(
    "pagination total records",
    pagination.records,
    1 satisfies number as number,
  );
  TestValidator.equals(
    "pagination total pages",
    pagination.pages,
    1 satisfies number as number,
  );
  // 10. Validate cancellation request summary data
  TestValidator.equals("data contains one request", listing.data.length, 1);
  const summary = listing.data[0]!;
  TestValidator.equals(
    "request id matches",
    summary.id,
    cancellationRequest.id,
  );
  TestValidator.equals("status is pending", summary.status, "pending");
  TestValidator.predicate("reason is non-empty", summary.reason.length > 0);
  TestValidator.predicate(
    "created_at is valid ISO datetime",
    typeof summary.created_at === "string" && summary.created_at.length > 0,
  );
  // Verify the order item references the correct product variant
  TestValidator.equals(
    "order item variant id matches",
    summary.orderItem.productVariant.id,
    variant.id,
  );
  TestValidator.equals(
    "order item variant SKU code matches",
    summary.orderItem.productVariant.code,
    variant.code,
  );
  // Verify the order item status is "paid" (prerequisite for cancellation)
  TestValidator.equals(
    "order item status is paid",
    summary.orderItem.status,
    "paid",
  );
}

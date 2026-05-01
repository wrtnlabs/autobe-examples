import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
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
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

/**
 * Test that a customer can list their own cancellation requests filtered by "pending" status.
 *
 * Validates the cancellation request listing endpoint with status filtering. The customer
 * places an order for a product variant, submits a cancellation request for one of the paid
 * order items, and then queries the cancellation requests list with a status filter set to
 * "pending". The response must include only the customer's own cancellation requests in
 * "pending" status, with each summary containing the request identifier, associated order
 * item reference with variant SKU, the customer-provided reason text, the "pending" status,
 * and the creation timestamp.
 *
 * Soft-deleted requests must be excluded from results and pagination metadata must be
 * accurate, reflecting the correct current page, records total, and page count.
 *
 * 1. Administrator registers and approves the seller registration.
 * 2. Seller creates a product with a purchasable variant and initial stock.
 * 3. Customer registers, adds the variant to cart, and places an order.
 * 4. Customer submits a cancellation request for the paid order item.
 * 5. Customer queries cancellation requests filtered by "pending" status.
 * 6. Validates that only pending requests are returned, the submitted request
 *    is included in the results, and pagination metadata is accurate.
 */
export async function test_api_cancellation_request_list_filter_by_pending_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registers
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller registers
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Administrator approves the seller
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: seller.id,
  });
  // 4. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 5. Seller creates a purchasable variant with initial stock
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          initialStockQuantity: 10,
        },
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // 6. Customer registers
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 7. Customer adds the variant to cart
  await generate_random_shopping_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: 1,
      },
    },
  );
  // 8. Customer places an order
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
  // 9. Extract the first order item (should be in "paid" status)
  const orderItem = order.items[0];
  TestValidator.equals("order item status", orderItem.status, "paid");
  // 10. Customer submits a cancellation request
  const cancellationRequest =
    await generate_random_shopping_mall_customer_order_items_cancellation_requests_create(
      customerConnection,
      {
        body: {
          reason: "Changed my mind about this purchase",
        },
        params: {
          itemId: orderItem.id,
        },
      },
    );
  typia.assert(cancellationRequest);
  TestValidator.equals(
    "cancellation request status",
    cancellationRequest.status,
    "pending",
  );
  // 11. Query cancellation requests filtered by "pending" status
  const result =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          status: "pending",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(result);
  // 12. Validate response data
  TestValidator.predicate(
    "response contains at least one cancellation request",
    result.data.length >= 1,
  );
  // All returned requests must have "pending" status
  TestValidator.predicate(
    "all returned cancellation requests have pending status",
    result.data.every((r) => r.status === "pending"),
  );
  // The cancellation request we submitted must be in the list
  const foundRequest = result.data.find((r) => r.id === cancellationRequest.id);
  TestValidator.predicate(
    "submitted cancellation request is present in pending list",
    foundRequest !== undefined,
  );
  // Validate the found request's summary fields
  if (foundRequest) {
    TestValidator.equals(
      "found request reason matches submitted reason",
      foundRequest.reason,
      cancellationRequest.reason,
    );
    TestValidator.equals(
      "found request status is pending",
      foundRequest.status,
      "pending",
    );
    TestValidator.predicate(
      "found request has valid created_at timestamp",
      foundRequest.created_at.length > 0,
    );
    TestValidator.predicate(
      "found request has associated order item reference",
      foundRequest.orderItem !== undefined,
    );
  }
  // 13. Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    result.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records total >= data length",
    result.pagination.records >= result.data.length,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    result.pagination.pages >= 1,
  );
  TestValidator.predicate("pagination limit > 0", result.pagination.limit > 0);
}

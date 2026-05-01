import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
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
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_customer_order_items_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_cancellation_requests_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

/**
 * Test retrieval of a cancellation request snapshot after seller rejection.
 *
 * Validates that when a seller rejects a customer's cancellation request,
 * an immutable snapshot is automatically created and remains accessible
 * to the customer. The snapshot preserves the customer's original reason
 * text and records the "rejected" status at the exact moment of the
 * seller's response.
 *
 * 1. Administrator registers, creates a product category.
 * 2. Seller registers, gets approved by admin.
 * 3. Seller creates a product with a variant and adds inventory stock.
 * 4. Customer registers and places an order for the variant.
 * 5. Customer submits a cancellation request with a descriptive reason.
 * 6. Seller rejects the cancellation request, triggering snapshot creation.
 * 7. Customer retrieves the snapshot and validates reason, status, and references.
 */
export async function test_api_cancellation_request_snapshot_view_after_seller_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: seller.id,
  });
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      params: { productId: product.id, variantId: variant.id },
      body: {
        quantity_change: 100,
        reason: "Initial stock for testing",
      },
    },
  );
  // 3. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
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
  const orderItem = order.items[0];
  const cancellationReason =
    "Changed my mind, the product does not match the description";
  // 4. Customer submits cancellation request
  const cancellationRequest =
    await generate_random_shopping_mall_customer_order_items_cancellation_requests_create(
      customerConnection,
      {
        params: { itemId: orderItem.id },
        body: { reason: cancellationReason },
      },
    );
  typia.assert(cancellationRequest);
  // 5. Seller rejects the cancellation request
  const rejectedRequest =
    await api.functional.shoppingMall.seller.cancellation_requests.update(
      sellerConnection,
      {
        requestId: cancellationRequest.id,
        body: { status: "rejected" },
      },
    );
  typia.assert(rejectedRequest);
  TestValidator.predicate(
    "rejected request contains at least one snapshot",
    rejectedRequest.snapshots.length > 0,
  );
  const snapshotId = rejectedRequest.snapshots[0].id;
  // 6. Customer retrieves the snapshot
  const snapshot =
    await api.functional.shoppingMall.customer.cancellation_requests.snapshots.at(
      customerConnection,
      {
        requestId: cancellationRequest.id,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 7. Validate snapshot contents
  TestValidator.equals(
    "snapshot reason matches customer's original submission",
    snapshot.reason,
    cancellationReason,
  );
  TestValidator.equals(
    "snapshot status records seller rejection",
    snapshot.status,
    "rejected",
  );
  TestValidator.predicate("snapshot has a valid id", snapshot.id.length > 0);
  TestValidator.predicate(
    "snapshot created_at reflects seller response time",
    snapshot.created_at.length > 0,
  );
  TestValidator.equals(
    "snapshot references the correct parent cancellation request",
    snapshot.cancellationRequest.id,
    cancellationRequest.id,
  );
}

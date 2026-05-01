import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
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
 * Test cancellation request snapshot listing after seller approval.
 *
 * Validates the complete workflow from product setup through order placement,
 * cancellation request submission, and seller approval. The seller's approval
 * of the cancellation request automatically creates an immutable snapshot
 * preserving the customer's reason text and the approval decision.
 *
 * The test then retrieves the paginated snapshot list and verifies:
 *
 * 1. Administrator creates a category and approves the seller.
 * 2. Seller creates a product with a variant and adds stock.
 * 3. Customer places an order and submits a cancellation request.
 * 4. Seller approves the cancellation, creating a snapshot automatically.
 * 5. Snapshot list contains exactly one snapshot with matching reason and "approved" status.
 * 6. Pagination metadata reflects one total record on one page.
 */
export async function test_api_cancellation_snapshot_list_after_seller_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    { body: {} },
  );
  typia.assert(category);
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // Admin approves seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  // 3. Seller creates product with variant and stock
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: { shopping_mall_category_id: category.id } },
  );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  const inventoryRecord =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        body: { quantity_change: 100, reason: "Initial stock" },
        params: { productId: product.id, variantId: variant.id },
      },
    );
  typia.assert(inventoryRecord);
  // 4. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 5. Customer places order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [{ variant_id: variant.id, quantity: 1 }],
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        street_address: RandomGenerator.paragraph({ sentences: 5 }),
        city: RandomGenerator.alphabets(8),
        state_province: RandomGenerator.alphabets(6),
        postal_code: RandomGenerator.alphaNumeric(5),
        country: RandomGenerator.alphabets(5),
      },
    },
  );
  typia.assert(order);
  // 6. Customer submits cancellation request
  const cancellationReason = "Changed my mind about this purchase";
  const cancellationRequest =
    await generate_random_shopping_mall_customer_order_items_cancellation_requests_create(
      customerConnection,
      {
        body: { reason: cancellationReason },
        params: { itemId: order.items[0].id },
      },
    );
  typia.assert(cancellationRequest);
  // 7. Seller approves cancellation
  const updatedRequest =
    await api.functional.shoppingMall.seller.cancellation_requests.update(
      sellerConnection,
      {
        requestId: cancellationRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  // 8. Retrieve snapshot list
  const requestBody = {
    limit: 10,
  } satisfies IShoppingMallCancellationRequestSnapshot.IRequest;
  const page =
    await api.functional.shoppingMall.seller.cancellation_requests.snapshots.index(
      sellerConnection,
      {
        requestId: cancellationRequest.id,
        body: requestBody,
      },
    );
  typia.assert(page);
  // 9. Validate pagination
  TestValidator.equals("total records", page.pagination.records, 1);
  TestValidator.equals("total pages", page.pagination.pages, 1);
  TestValidator.equals("current page", page.pagination.current, 1);
  TestValidator.equals("limit matches request", page.pagination.limit, 10);
  // 10. Validate snapshot content
  TestValidator.equals("snapshots count", page.data.length, 1);
  const snapshot = page.data[0];
  TestValidator.equals("snapshot reason", snapshot.reason, cancellationReason);
  TestValidator.equals("snapshot status", snapshot.status, "approved");
  TestValidator.predicate(
    "snapshot id is UUID",
    /^[0-9a-f-]{36}$/i.test(snapshot.id),
  );
  TestValidator.predicate(
    "snapshot has created_at",
    snapshot.created_at.length > 0,
  );
}

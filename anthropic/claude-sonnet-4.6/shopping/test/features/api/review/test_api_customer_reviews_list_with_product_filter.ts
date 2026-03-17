import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import type { IShoppingMallProductSnapshotSkus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkus";
import type { IShoppingMallProductSnapshotSkusOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkusOption";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
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
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_customer_products_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_products_reviews_create";
import { generate_random_shopping_mall_seller_approvals_create } from "../../../generate/generate_random_shopping_mall_seller_approvals_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_orders_shipments_items_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_items_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_item } from "../../../prepare/prepare_random_shopping_mall_shipment_item";

export async function test_api_customer_reviews_list_with_product_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Submit a seller approval request
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  // 3. Register a new admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 4. Admin approves the seller
  const updatedApproval =
    await api.functional.shoppingMall.admin.sellerApprovals.update(
      adminConnection,
      {
        approvalId: approval.id,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(updatedApproval);
  // 5. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(product);
  // 6. Seller adds a variant to the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {},
      },
    );
  typia.assert(variant);
  // 7. Seller adds inventory to the variant
  const inventoryRecord =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity: 10,
          note: "Initial stock for testing",
        },
      },
    );
  typia.assert(inventoryRecord);
  // 8. Register a customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 9. Customer places an order for the variant
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [
          {
            product_variant_id: variant.id,
            quantity: 1,
          },
        ],
      },
    },
  );
  typia.assert(order);
  const orderItemId = order.items[0]!.id;
  // 10. Seller creates a shipment for the order
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: {
          orderItemIds: [orderItemId],
        },
      },
    );
  typia.assert(shipment);
  // 11. Seller assigns order item to the shipment
  const shipmentItem =
    await generate_random_shopping_mall_seller_orders_shipments_items_create(
      sellerConnection,
      {
        params: { orderId: order.id, shipmentId: shipment.id },
        body: {
          orderItemIds: [orderItemId],
        },
      },
    );
  typia.assert(shipmentItem);
  // 12. Customer submits a review for the product (rating = 4)
  const review =
    await generate_random_shopping_mall_customer_products_reviews_create(
      customerConnection,
      {
        params: { productId: product.id },
        body: {
          order_item_id: orderItemId,
          rating: 4,
          body: "Great product, highly recommend!",
        },
      },
    );
  typia.assert(review);
  // 13. PRIMARY TEST: List reviews filtered by the created product
  const reviewListByProduct =
    await api.functional.shoppingMall.customer.reviews.index(
      customerConnection,
      {
        body: {
          productId: product.id,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(reviewListByProduct);
  TestValidator.equals(
    "pagination.records should be 1",
    reviewListByProduct.pagination.records,
    1,
  );
  TestValidator.equals(
    "data array should have 1 item",
    reviewListByProduct.data.length,
    1,
  );
  const reviewItem = reviewListByProduct.data[0]!;
  TestValidator.equals(
    "review id matches created review",
    reviewItem.id,
    review.id,
  );
  TestValidator.equals("review rating is 4", reviewItem.rating, 4);
  TestValidator.equals(
    "review product id matches",
    reviewItem.product.id,
    product.id,
  );
  TestValidator.equals(
    "review snapshotCount is 0",
    reviewItem.snapshotCount,
    0,
  );
  TestValidator.equals(
    "review deleted_at is null",
    reviewItem.deleted_at,
    null,
  );
  TestValidator.predicate(
    "pagination.current >= 1",
    reviewListByProduct.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination.limit >= 1",
    reviewListByProduct.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination.pages >= 1",
    reviewListByProduct.pagination.pages >= 1,
  );
  // 14. EMPTY RESULT TEST: Non-existent productId returns empty page
  const nonExistentProductId = typia.random<string & tags.Format<"uuid">>();
  const emptyReviewList =
    await api.functional.shoppingMall.customer.reviews.index(
      customerConnection,
      {
        body: {
          productId: nonExistentProductId,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(emptyReviewList);
  TestValidator.equals(
    "empty result pagination.records should be 0",
    emptyReviewList.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result data array should be empty",
    emptyReviewList.data.length,
    0,
  );
  // 15. SORT TEST: sortBy=rating, sortOrder=asc accepted without error
  const sortedReviewList =
    await api.functional.shoppingMall.customer.reviews.index(
      customerConnection,
      {
        body: {
          productId: product.id,
          sortBy: "rating",
          sortOrder: "asc",
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(sortedReviewList);
  TestValidator.equals(
    "sorted list pagination.records should be 1",
    sortedReviewList.pagination.records,
    1,
  );
  TestValidator.equals(
    "sorted list data has 1 item",
    sortedReviewList.data.length,
    1,
  );
}

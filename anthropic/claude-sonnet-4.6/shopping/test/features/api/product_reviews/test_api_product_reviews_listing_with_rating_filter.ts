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
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_customer_products_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_products_reviews_create";
import { generate_random_shopping_mall_seller_approvals_create } from "../../../generate/generate_random_shopping_mall_seller_approvals_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_orders_shipments_items_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_items_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_item } from "../../../prepare/prepare_random_shopping_mall_shipment_item";

export async function test_api_product_reviews_listing_with_rating_filter(
  connection: api.IConnection,
): Promise<void> {
  // ===== STEP 1: Admin setup =====
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Create a product category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: `TestCategory-${RandomGenerator.alphabets(8)}`,
        description: "Test category for review filter test",
        parent_id: null,
      },
    },
  );
  typia.assert(category);
  // ===== STEP 2: Seller setup =====
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // Seller submits approval request
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  // Admin approves the seller
  const approvedSeller =
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
  typia.assert(approvedSeller);
  // ===== STEP 3: Seller creates product with variant and inventory =====
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: `TestProduct-${RandomGenerator.alphabets(8)}`,
        description: "Product for review filter test",
        base_price: 10000,
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: `SKU-${RandomGenerator.alphaNumeric(12)}`,
          priceOverride: null,
          options: [
            {
              id: typia.random<string & tags.Format<"uuid">>(),
              product_variant_id: typia.random<string & tags.Format<"uuid">>(),
              key: "color",
              value: "red",
              sequence: 0,
              created_at: new Date().toISOString(),
            },
          ],
        },
      },
    );
  typia.assert(variant);
  // Add inventory
  const inventoryRecord =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity: 100,
          note: "Initial stock for testing",
        },
      },
    );
  typia.assert(inventoryRecord);
  // ===== STEP 4: Customer A places order =====
  const customerAConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerAConnection, {});
  const orderA = await generate_random_shopping_mall_customer_orders_create(
    customerAConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        recipient_phone: RandomGenerator.mobile(),
        shipping_address_line1: "123 Test Street",
        shipping_address_line2: null,
        shipping_city: "Seoul",
        shipping_state: null,
        shipping_postal_code: "12345",
        shipping_country: "KR",
        items: [
          {
            product_variant_id: variant.id,
            quantity: 1,
          },
        ],
      },
    },
  );
  typia.assert(orderA);
  const orderAItemId = orderA.items[0]!.id;
  // ===== STEP 5: Seller creates shipment for Customer A's order =====
  // Creating the shipment with orderItemIds transitions the items to 'shipped'
  const shipmentA =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: orderA.id },
        body: {
          carrier: "TestCarrier",
          trackingNumber: `TRACK-${RandomGenerator.alphaNumeric(10)}`,
          orderItemIds: [orderAItemId],
          shippedAt: new Date().toISOString(),
          estimatedDeliveryAt: new Date().toISOString(),
        },
      },
    );
  typia.assert(shipmentA);
  // ===== STEP 6: Customer A submits 5-star review =====
  const reviewA =
    await generate_random_shopping_mall_customer_products_reviews_create(
      customerAConnection,
      {
        params: { productId: product.id },
        body: {
          order_item_id: orderAItemId,
          rating: 5,
          body: "Excellent product, highly recommended!",
        },
      },
    );
  typia.assert(reviewA);
  // ===== STEP 7: Customer B places order =====
  const customerBConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerBConnection, {});
  const orderB = await generate_random_shopping_mall_customer_orders_create(
    customerBConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        recipient_phone: RandomGenerator.mobile(),
        shipping_address_line1: "456 Test Avenue",
        shipping_address_line2: null,
        shipping_city: "Busan",
        shipping_state: null,
        shipping_postal_code: "67890",
        shipping_country: "KR",
        items: [
          {
            product_variant_id: variant.id,
            quantity: 1,
          },
        ],
      },
    },
  );
  typia.assert(orderB);
  const orderBItemId = orderB.items[0]!.id;
  // Seller creates shipment for Customer B's order
  const shipmentB =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: orderB.id },
        body: {
          carrier: "TestCarrier",
          trackingNumber: `TRACK-${RandomGenerator.alphaNumeric(10)}`,
          orderItemIds: [orderBItemId],
          shippedAt: new Date().toISOString(),
          estimatedDeliveryAt: new Date().toISOString(),
        },
      },
    );
  typia.assert(shipmentB);
  // Customer B submits 2-star review
  const reviewB =
    await generate_random_shopping_mall_customer_products_reviews_create(
      customerBConnection,
      {
        params: { productId: product.id },
        body: {
          order_item_id: orderBItemId,
          rating: 2,
          body: "Not great, some issues encountered.",
        },
      },
    );
  typia.assert(reviewB);
  // ===== PRIMARY TEST: Filter by minRating=4 =====
  // Public endpoint - no auth header needed
  const filteredByMinRating =
    await api.functional.shoppingMall.products.reviews.index(
      { host: connection.host },
      {
        productId: product.id,
        body: {
          minRating: 4,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(filteredByMinRating);
  // Should contain exactly the 5-star review
  TestValidator.equals(
    "minRating=4 records count",
    filteredByMinRating.pagination.records,
    1,
  );
  TestValidator.equals(
    "minRating=4 pages count",
    filteredByMinRating.pagination.pages,
    1,
  );
  TestValidator.equals(
    "minRating=4 current page",
    filteredByMinRating.pagination.current,
    1,
  );
  TestValidator.equals(
    "minRating=4 data length",
    filteredByMinRating.data.length,
    1,
  );
  TestValidator.predicate(
    "minRating=4 review rating is >= 4",
    filteredByMinRating.data[0]!.rating >= 4,
  );
  TestValidator.equals(
    "minRating=4 review id matches 5-star review",
    filteredByMinRating.data[0]!.id,
    reviewA.id,
  );
  TestValidator.predicate(
    "minRating=4 review is not deleted",
    filteredByMinRating.data[0]!.deleted_at === null,
  );
  TestValidator.predicate(
    "minRating=4 does not include 2-star review",
    !filteredByMinRating.data.some((r) => r.id === reviewB.id),
  );
  // ===== TEST: Filter by maxRating=3 =====
  const filteredByMaxRating =
    await api.functional.shoppingMall.products.reviews.index(
      { host: connection.host },
      {
        productId: product.id,
        body: {
          maxRating: 3,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(filteredByMaxRating);
  // Should contain exactly the 2-star review
  TestValidator.equals(
    "maxRating=3 records count",
    filteredByMaxRating.pagination.records,
    1,
  );
  TestValidator.equals(
    "maxRating=3 data length",
    filteredByMaxRating.data.length,
    1,
  );
  TestValidator.predicate(
    "maxRating=3 review rating is <= 3",
    filteredByMaxRating.data[0]!.rating <= 3,
  );
  TestValidator.equals(
    "maxRating=3 review id matches 2-star review",
    filteredByMaxRating.data[0]!.id,
    reviewB.id,
  );
  TestValidator.predicate(
    "maxRating=3 review is not deleted",
    filteredByMaxRating.data[0]!.deleted_at === null,
  );
  TestValidator.predicate(
    "maxRating=3 does not include 5-star review",
    !filteredByMaxRating.data.some((r) => r.id === reviewA.id),
  );
  // ===== TEST: No filter (all reviews) =====
  const allReviews = await api.functional.shoppingMall.products.reviews.index(
    { host: connection.host },
    {
      productId: product.id,
      body: {} satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(allReviews);
  // Should contain both reviews
  TestValidator.equals(
    "no filter records count",
    allReviews.pagination.records,
    2,
  );
  TestValidator.equals("no filter data length", allReviews.data.length, 2);
  // Verify both reviews are present
  const reviewIds = allReviews.data.map((r) => r.id);
  TestValidator.predicate(
    "all reviews contains 5-star review",
    reviewIds.includes(reviewA.id),
  );
  TestValidator.predicate(
    "all reviews contains 2-star review",
    reviewIds.includes(reviewB.id),
  );
  // Verify sorted by updated_at DESC (most recent first)
  if (allReviews.data.length >= 2) {
    const firstUpdated = new Date(allReviews.data[0]!.updated_at).getTime();
    const secondUpdated = new Date(allReviews.data[1]!.updated_at).getTime();
    TestValidator.predicate(
      "reviews sorted by updated_at DESC",
      firstUpdated >= secondUpdated,
    );
  }
  // Verify all active reviews have deleted_at = null
  for (const review of allReviews.data) {
    TestValidator.predicate(
      `review ${review.id} is not deleted`,
      review.deleted_at === null,
    );
  }
  // ===== TEST: Public access (no authentication required) =====
  const publicConnection: api.IConnection = { host: connection.host };
  const publicResult = await api.functional.shoppingMall.products.reviews.index(
    publicConnection,
    {
      productId: product.id,
      body: {} satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(publicResult);
  TestValidator.equals(
    "public access returns same count as authenticated",
    publicResult.pagination.records,
    2,
  );
}

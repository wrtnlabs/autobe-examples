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

export async function test_api_customer_reviews_list_with_rating_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // ─── 1. Register & Approve Seller ───────────────────────────────────────
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    {},
  );
  typia.assert(approval);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
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
  // ─── 2. Seller Creates Product + Variant + Inventory ───────────────────
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant);
  const inventoryRecord =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        body: { quantity: 10, note: "Initial stock for test" },
        params: { productId: product.id, variantId: variant.id },
      },
    );
  typia.assert(inventoryRecord);
  // ─── 3. Customer A: Order, Ship, Review (5 stars) ───────────────────────
  const customerAConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerAConnection, {});
  const orderA = await generate_random_shopping_mall_customer_orders_create(
    customerAConnection,
    {
      body: {
        items: [{ product_variant_id: variant.id, quantity: 1 }],
      },
    },
  );
  typia.assert(orderA);
  const orderItemAId = orderA.items[0]!.id;
  const shipmentA =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        body: {
          carrier: "TestCarrier",
          trackingNumber: RandomGenerator.alphaNumeric(10),
          orderItemIds: [orderItemAId],
        },
        params: { orderId: orderA.id },
      },
    );
  typia.assert(shipmentA);
  const reviewA =
    await generate_random_shopping_mall_customer_products_reviews_create(
      customerAConnection,
      {
        body: {
          order_item_id: orderItemAId,
          rating: 5,
          body: "Excellent product!",
        },
        params: { productId: product.id },
      },
    );
  typia.assert(reviewA);
  // ─── 4. Customer B: Order, Ship, Review (2 stars) ───────────────────────
  const customerBConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerBConnection, {});
  const orderB = await generate_random_shopping_mall_customer_orders_create(
    customerBConnection,
    {
      body: {
        items: [{ product_variant_id: variant.id, quantity: 1 }],
      },
    },
  );
  typia.assert(orderB);
  const orderItemBId = orderB.items[0]!.id;
  const shipmentB =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        body: {
          carrier: "TestCarrier",
          trackingNumber: RandomGenerator.alphaNumeric(10),
          orderItemIds: [orderItemBId],
        },
        params: { orderId: orderB.id },
      },
    );
  typia.assert(shipmentB);
  const reviewB =
    await generate_random_shopping_mall_customer_products_reviews_create(
      customerBConnection,
      {
        body: {
          order_item_id: orderItemBId,
          rating: 2,
          body: "Not very good.",
        },
        params: { productId: product.id },
      },
    );
  typia.assert(reviewB);
  // ─── 5. Filter minRating:4, maxRating:5 → only 5-star review ────────────
  const highRatingPage =
    await api.functional.shoppingMall.customer.reviews.index(
      customerAConnection,
      {
        body: {
          productId: product.id,
          minRating: 4,
          maxRating: 5,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(highRatingPage);
  TestValidator.equals(
    "high rating filter: records count",
    highRatingPage.pagination.records,
    1,
  );
  TestValidator.equals(
    "high rating filter: review rating",
    highRatingPage.data[0]!.rating,
    5,
  );
  // ─── 6. Filter minRating:1, maxRating:3 → only 2-star review ────────────
  const lowRatingPage =
    await api.functional.shoppingMall.customer.reviews.index(
      customerAConnection,
      {
        body: {
          productId: product.id,
          minRating: 1,
          maxRating: 3,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(lowRatingPage);
  TestValidator.equals(
    "low rating filter: records count",
    lowRatingPage.pagination.records,
    1,
  );
  TestValidator.equals(
    "low rating filter: review rating",
    lowRatingPage.data[0]!.rating,
    2,
  );
  // ─── 7. Full range minRating:1, maxRating:5 → both reviews ──────────────
  const fullRangePage =
    await api.functional.shoppingMall.customer.reviews.index(
      customerAConnection,
      {
        body: {
          productId: product.id,
          minRating: 1,
          maxRating: 5,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(fullRangePage);
  TestValidator.equals(
    "full range: total records",
    fullRangePage.pagination.records,
    2,
  );
  // ─── 8. Sort by rating DESC → 5-star first ──────────────────────────────
  const sortedDescPage =
    await api.functional.shoppingMall.customer.reviews.index(
      customerAConnection,
      {
        body: {
          productId: product.id,
          sortBy: "rating",
          sortOrder: "desc",
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(sortedDescPage);
  TestValidator.equals(
    "sort desc: first review rating",
    sortedDescPage.data[0]!.rating,
    5,
  );
  TestValidator.equals(
    "sort desc: second review rating",
    sortedDescPage.data[1]!.rating,
    2,
  );
  // ─── 9. Sort by rating ASC → 2-star first ───────────────────────────────
  const sortedAscPage =
    await api.functional.shoppingMall.customer.reviews.index(
      customerAConnection,
      {
        body: {
          productId: product.id,
          sortBy: "rating",
          sortOrder: "asc",
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(sortedAscPage);
  TestValidator.equals(
    "sort asc: first review rating",
    sortedAscPage.data[0]!.rating,
    2,
  );
  TestValidator.equals(
    "sort asc: second review rating",
    sortedAscPage.data[1]!.rating,
    5,
  );
  // ─── 10. Pagination: limit:1, page:1 ────────────────────────────────────
  const paginatedPage1 =
    await api.functional.shoppingMall.customer.reviews.index(
      customerAConnection,
      {
        body: {
          productId: product.id,
          limit: 1,
          page: 1,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(paginatedPage1);
  TestValidator.equals(
    "pagination page1: data length",
    paginatedPage1.data.length,
    1,
  );
  TestValidator.equals(
    "pagination page1: total records",
    paginatedPage1.pagination.records,
    2,
  );
  TestValidator.equals(
    "pagination page1: total pages",
    paginatedPage1.pagination.pages,
    2,
  );
  // ─── 11. Pagination: limit:1, page:2 ────────────────────────────────────
  const paginatedPage2 =
    await api.functional.shoppingMall.customer.reviews.index(
      customerAConnection,
      {
        body: {
          productId: product.id,
          limit: 1,
          page: 2,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(paginatedPage2);
  TestValidator.equals(
    "pagination page2: data length",
    paginatedPage2.data.length,
    1,
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
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

export async function test_api_review_snapshot_admin_retrieval_chronological(
  connection: api.IConnection,
): Promise<void> {
  // STEP 1: Admin joins and creates a category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    { body: { name: RandomGenerator.alphabets(8) } },
  );
  typia.assert(category);
  // STEP 2: Seller joins and gets approved
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  const approvedApproval =
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
  typia.assert(approvedApproval);
  // STEP 3: Seller creates product, variant, inventory
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: 10000,
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
          sku: RandomGenerator.alphaNumeric(12),
          options: [
            {
              id: typia.random<string & tags.Format<"uuid">>(),
              product_variant_id: typia.random<string & tags.Format<"uuid">>(),
              key: "color",
              value: "red",
              sequence: 0 as number & tags.Type<"int32">,
              created_at: new Date().toISOString(),
            },
          ],
        },
      },
    );
  typia.assert(variant);
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      params: { productId: product.id, variantId: variant.id },
      body: { quantity: 100, note: "Initial stock for testing" },
    },
  );
  // STEP 4: Customer joins and places order
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        recipient_phone: RandomGenerator.mobile(),
        shipping_address_line1: "123 Test Street",
        shipping_city: "Seoul",
        shipping_postal_code: "12345",
        shipping_country: "KR",
        items: [
          {
            product_variant_id: variant.id,
            quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          },
        ],
      },
    },
  );
  typia.assert(order);
  const orderItemId = order.items[0]!.id;
  // STEP 5: Seller creates shipment and assigns item (advancing to delivered)
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: {
          carrier: "TestCarrier",
          orderItemIds: [orderItemId],
        },
      },
    );
  typia.assert(shipment);
  await generate_random_shopping_mall_seller_orders_shipments_items_create(
    sellerConnection,
    {
      params: { orderId: order.id, shipmentId: shipment.id },
      body: { orderItemIds: [orderItemId] },
    },
  );
  // STEP 6: Customer creates a review (first snapshot auto-created)
  const initialRating = 4 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5>;
  const initialBody = "Great product! Very satisfied.";
  const review =
    await generate_random_shopping_mall_customer_products_reviews_create(
      customerConnection,
      {
        params: { productId: product.id },
        body: {
          order_item_id: orderItemId,
          rating: initialRating,
          body: initialBody,
        },
      },
    );
  typia.assert(review);
  // STEP 7: Customer edits review (creates second snapshot)
  const updatedRating = 5 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5>;
  const updatedBody = "After further use, this is absolutely excellent!";
  const updatedReview =
    await api.functional.shoppingMall.customer.products.reviews.update(
      customerConnection,
      {
        productId: product.id,
        reviewId: review.id,
        body: {
          rating: updatedRating,
          body: updatedBody,
        } satisfies IShoppingMallReview.IUpdate,
      },
    );
  typia.assert(updatedReview);
  // STEP 8: Admin retrieves snapshots (default pagination)
  const snapshotsPage =
    await api.functional.shoppingMall.admin.products.reviews.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        reviewId: review.id,
        body: {} satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPage);
  TestValidator.predicate(
    "snapshots data non-empty",
    snapshotsPage.data.length > 0,
  );
  TestValidator.predicate(
    "pagination current >= 1",
    snapshotsPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit >= 1",
    snapshotsPage.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records >= data length",
    snapshotsPage.pagination.records >= snapshotsPage.data.length,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    snapshotsPage.pagination.pages >= 1,
  );
  // Validate chronological order (ascending by created_at)
  for (let i = 1; i < snapshotsPage.data.length; i++) {
    const prev = snapshotsPage.data[i - 1]!;
    const curr = snapshotsPage.data[i]!;
    TestValidator.predicate(
      `snapshot[${i}] created_at >= snapshot[${i - 1}] created_at`,
      new Date(curr.created_at).getTime() >=
        new Date(prev.created_at).getTime(),
    );
  }
  // Validate each snapshot has reviewId matching review.id
  for (const snapshot of snapshotsPage.data) {
    TestValidator.equals(
      "snapshot reviewId matches review.id",
      snapshot.reviewId,
      review.id,
    );
  }
  TestValidator.predicate(
    "at least 2 snapshots exist",
    snapshotsPage.pagination.records >= 2,
  );
  const totalSnapshots = snapshotsPage.pagination.records;
  // STEP 9: Filtering test - ratingMin filter
  const firstSnapshot = snapshotsPage.data[0]!;
  const firstRating = firstSnapshot.rating;
  const filteredByRating =
    await api.functional.shoppingMall.admin.products.reviews.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        reviewId: review.id,
        body: {
          ratingMin: firstRating,
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(filteredByRating);
  for (const snapshot of filteredByRating.data) {
    TestValidator.predicate(
      "filtered snapshot rating >= ratingMin",
      snapshot.rating >= firstRating,
    );
  }
  // STEP 10: Date range filtering - cover only second snapshot
  if (snapshotsPage.data.length >= 2) {
    const secondSnapshot = snapshotsPage.data[1]!;
    const fromTime = secondSnapshot.created_at;
    const toTime = new Date(
      new Date(secondSnapshot.created_at).getTime() + 60000,
    ).toISOString();
    const filteredByDate =
      await api.functional.shoppingMall.admin.products.reviews.snapshots.index(
        adminConnection,
        {
          productId: product.id,
          reviewId: review.id,
          body: {
            from: fromTime,
            to: toTime,
          } satisfies IShoppingMallReviewSnapshot.IRequest,
        },
      );
    typia.assert(filteredByDate);
    TestValidator.predicate(
      "date-filtered results non-empty",
      filteredByDate.data.length >= 1,
    );
    for (const snapshot of filteredByDate.data) {
      const snapshotTime = new Date(snapshot.created_at).getTime();
      TestValidator.predicate(
        "snapshot created_at >= from boundary",
        snapshotTime >= new Date(fromTime).getTime(),
      );
      TestValidator.predicate(
        "snapshot created_at <= to boundary",
        snapshotTime <= new Date(toTime).getTime(),
      );
    }
  }
  // STEP 11: Pagination test - limit 1, page 1
  const paginatedPage =
    await api.functional.shoppingMall.admin.products.reviews.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        reviewId: review.id,
        body: {
          limit: 1 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(paginatedPage);
  TestValidator.equals(
    "paginated data has exactly 1 item",
    paginatedPage.data.length,
    1,
  );
  TestValidator.equals(
    "pagination limit is 1",
    paginatedPage.pagination.limit,
    1,
  );
  TestValidator.equals(
    "pagination pages equals total snapshots",
    paginatedPage.pagination.pages,
    totalSnapshots,
  );
}

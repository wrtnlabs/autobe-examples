import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_review_detail_snapshot_history_after_edit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  // 2. Admin creates a category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    { body: { name: RandomGenerator.alphaNumeric(8) } },
  );
  typia.assert(category);
  // 3. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Seller submits approval request
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  // 5. Admin approves the seller
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
  // 6. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: 10000,
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // 7. Seller creates a product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: `SKU-${RandomGenerator.alphaNumeric(10)}`,
          priceOverride: null,
        },
      },
    );
  typia.assert(variant);
  // 8. Seller adds inventory to the variant
  const inventoryRecord =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity: 100,
          note: "Initial stock",
        },
      },
    );
  typia.assert(inventoryRecord);
  // 9. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 10. Customer creates an order
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
            quantity: 1,
          },
        ],
      },
    },
  );
  typia.assert(order);
  const orderItem = order.items[0];
  typia.assertGuard(orderItem!);
  // 11. Seller creates a shipment (items assigned via orderItemIds)
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: {
          carrier: "FedEx",
          trackingNumber: `TRACK-${RandomGenerator.alphaNumeric(10)}`,
          orderItemIds: [orderItem.id],
          shippedAt: new Date().toISOString(),
          estimatedDeliveryAt: new Date(
            Date.now() + 3 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
      },
    );
  typia.assert(shipment);
  // 12. Seller updates shipment to mark as delivered
  const deliveredShipment =
    await api.functional.shoppingMall.seller.orders.shipments.update(
      sellerConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
        body: {
          carrier: "FedEx",
          tracking_number: shipment.tracking_number,
          shipped_at: shipment.shipped_at,
          estimated_delivery_at: new Date().toISOString(),
        } satisfies IShoppingMallShipment.IUpdate,
      },
    );
  typia.assert(deliveredShipment);
  // 13. Customer creates initial review (rating=3)
  const initialReview =
    await generate_random_shopping_mall_customer_products_reviews_create(
      customerConnection,
      {
        params: { productId: product.id },
        body: {
          order_item_id: orderItem.id,
          rating: 3,
          body: "Initial review text",
        },
      },
    );
  typia.assert(initialReview);
  // 14. Customer edits the review (rating=5)
  const updatedReview =
    await api.functional.shoppingMall.customer.products.reviews.update(
      customerConnection,
      {
        productId: product.id,
        reviewId: initialReview.id,
        body: {
          rating: 5,
          body: "Updated review text",
        } satisfies IShoppingMallReview.IUpdate,
      },
    );
  typia.assert(updatedReview);
  // 15. Call GET without authentication to retrieve the review detail
  const publicConnection: api.IConnection = { host: connection.host };
  const reviewDetail = await api.functional.shoppingMall.products.reviews.at(
    publicConnection,
    {
      productId: product.id,
      reviewId: initialReview.id,
    },
  );
  typia.assert(reviewDetail);
  // 16. Validate response
  // Latest content should reflect the edit
  TestValidator.equals(
    "review rating should be 5 after edit",
    reviewDetail.rating,
    5,
  );
  TestValidator.equals(
    "review body should reflect the updated text",
    reviewDetail.body,
    "Updated review text",
  );
  // deleted_at should be null
  TestValidator.equals(
    "review deleted_at should be null",
    reviewDetail.deleted_at,
    null,
  );
  // updated_at should be >= created_at after edit
  TestValidator.predicate(
    "updated_at should be >= created_at after edit",
    new Date(reviewDetail.updated_at) >= new Date(reviewDetail.created_at),
  );
  // Snapshots should have at least 2 entries
  TestValidator.predicate(
    "snapshots should have at least 2 entries",
    reviewDetail.snapshots.length >= 2,
  );
  // Snapshots should be ordered chronologically (oldest first)
  const snapshots = reviewDetail.snapshots;
  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1];
    const curr = snapshots[i];
    typia.assertGuard(prev!);
    typia.assertGuard(curr!);
    TestValidator.predicate(
      `snapshot[${i}] createdAt should be >= snapshot[${i - 1}] createdAt`,
      new Date(curr.createdAt) >= new Date(prev.createdAt),
    );
  }
  // First snapshot captures original submission state
  const firstSnapshot = snapshots[0];
  typia.assertGuard(firstSnapshot!);
  TestValidator.equals(
    "first snapshot rating should be 3 (original submission)",
    firstSnapshot.rating,
    3,
  );
  TestValidator.equals(
    "first snapshot body should be 'Initial review text'",
    firstSnapshot.body,
    "Initial review text",
  );
  // Second snapshot captures updated state
  const secondSnapshot = snapshots[1];
  typia.assertGuard(secondSnapshot!);
  TestValidator.equals(
    "second snapshot rating should be 5 (after edit)",
    secondSnapshot.rating,
    5,
  );
  TestValidator.equals(
    "second snapshot body should be 'Updated review text'",
    secondSnapshot.body,
    "Updated review text",
  );
}

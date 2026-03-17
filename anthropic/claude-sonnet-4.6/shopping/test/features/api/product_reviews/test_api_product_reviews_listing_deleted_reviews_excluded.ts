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

export async function test_api_product_reviews_listing_deleted_reviews_excluded(
  connection: api.IConnection,
): Promise<void> {
  // ─────────────────────────────────────────────────────────────────────────
  // 1. Admin setup: join, create category
  // ─────────────────────────────────────────────────────────────────────────
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    { body: { name: RandomGenerator.alphaNumeric(8) } },
  );
  typia.assert(category);
  // ─────────────────────────────────────────────────────────────────────────
  // 2. Seller setup: join, submit approval, admin approves
  // ─────────────────────────────────────────────────────────────────────────
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
  // ─────────────────────────────────────────────────────────────────────────
  // 3. Seller creates product with variant and inventory
  // ─────────────────────────────────────────────────────────────────────────
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
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
  // ─────────────────────────────────────────────────────────────────────────
  // 4. Customer 1: join, place order, seller ships, customer reviews, edits, deletes
  // ─────────────────────────────────────────────────────────────────────────
  const customer1Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer1Connection, {});
  const order1 = await generate_random_shopping_mall_customer_orders_create(
    customer1Connection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        recipient_phone: RandomGenerator.mobile(),
        shipping_address_line1: RandomGenerator.paragraph({ sentences: 1 }),
        shipping_address_line2: null,
        shipping_city: RandomGenerator.alphabets(6),
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
  typia.assert(order1);
  const orderItem1 = order1.items[0];
  typia.assertGuard(orderItem1!);
  // Seller creates shipment for order1 with the order item (transitions item to 'shipped')
  const shipment1 =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order1.id },
        body: {
          carrier: "TestCarrier",
          trackingNumber: RandomGenerator.alphaNumeric(12),
          orderItemIds: [orderItem1.id],
          shippedAt: new Date().toISOString(),
          estimatedDeliveryAt: new Date().toISOString(),
        },
      },
    );
  typia.assert(shipment1);
  // Customer 1 submits a 4-star review
  const review1 =
    await generate_random_shopping_mall_customer_products_reviews_create(
      customer1Connection,
      {
        params: { productId: product.id },
        body: {
          order_item_id: orderItem1.id,
          rating: 4,
          body: "Great product! Really satisfied.",
        },
      },
    );
  typia.assert(review1);
  // Customer 1 edits the review to create a snapshot
  const updatedReview1 =
    await api.functional.shoppingMall.customer.products.reviews.update(
      customer1Connection,
      {
        productId: product.id,
        reviewId: review1.id,
        body: {
          rating: 4,
          body: "Updated: Still a great product!",
        } satisfies IShoppingMallReview.IUpdate,
      },
    );
  typia.assert(updatedReview1);
  // Customer 1 deletes the review
  await api.functional.shoppingMall.customer.products.reviews.erase(
    customer1Connection,
    {
      productId: product.id,
      reviewId: review1.id,
    },
  );
  // ─────────────────────────────────────────────────────────────────────────
  // 5. Primary assertion: deleted review excluded from public listing
  // ─────────────────────────────────────────────────────────────────────────
  const publicConnection: api.IConnection = { host: connection.host };
  const listingAfterDelete =
    await api.functional.shoppingMall.products.reviews.index(publicConnection, {
      productId: product.id,
      body: {} satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(listingAfterDelete);
  TestValidator.equals(
    "no reviews after deletion - records",
    listingAfterDelete.pagination.records,
    0,
  );
  TestValidator.equals(
    "no reviews after deletion - pages",
    listingAfterDelete.pagination.pages,
    0,
  );
  TestValidator.equals(
    "no reviews after deletion - data empty",
    listingAfterDelete.data.length,
    0,
  );
  TestValidator.predicate(
    "deleted review must not appear in listing",
    !listingAfterDelete.data.some((r) => r.id === review1.id),
  );
  // ─────────────────────────────────────────────────────────────────────────
  // 6. Customer 2: join, place order, seller ships, customer reviews
  // ─────────────────────────────────────────────────────────────────────────
  const customer2Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer2Connection, {});
  const order2 = await generate_random_shopping_mall_customer_orders_create(
    customer2Connection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        recipient_phone: RandomGenerator.mobile(),
        shipping_address_line1: RandomGenerator.paragraph({ sentences: 1 }),
        shipping_address_line2: null,
        shipping_city: RandomGenerator.alphabets(6),
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
  typia.assert(order2);
  const orderItem2 = order2.items[0];
  typia.assertGuard(orderItem2!);
  const shipment2 =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order2.id },
        body: {
          carrier: "TestCarrier",
          trackingNumber: RandomGenerator.alphaNumeric(12),
          orderItemIds: [orderItem2.id],
          shippedAt: new Date().toISOString(),
          estimatedDeliveryAt: new Date().toISOString(),
        },
      },
    );
  typia.assert(shipment2);
  // Customer 2 submits a 3-star review
  const review2 =
    await generate_random_shopping_mall_customer_products_reviews_create(
      customer2Connection,
      {
        params: { productId: product.id },
        body: {
          order_item_id: orderItem2.id,
          rating: 3,
          body: "Decent product, could be better.",
        },
      },
    );
  typia.assert(review2);
  // ─────────────────────────────────────────────────────────────────────────
  // 7. Secondary assertion: only customer 2's 3-star review visible
  // ─────────────────────────────────────────────────────────────────────────
  const listingAfterSecondReview =
    await api.functional.shoppingMall.products.reviews.index(publicConnection, {
      productId: product.id,
      body: {} satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(listingAfterSecondReview);
  TestValidator.equals(
    "one review after second customer reviews - records",
    listingAfterSecondReview.pagination.records,
    1,
  );
  TestValidator.equals(
    "one review data length",
    listingAfterSecondReview.data.length,
    1,
  );
  const visibleReview = listingAfterSecondReview.data[0];
  typia.assertGuard(visibleReview!);
  TestValidator.equals(
    "visible review rating is 3 stars",
    visibleReview.rating,
    3,
  );
  TestValidator.equals(
    "visible review belongs to customer2",
    visibleReview.id,
    review2.id,
  );
  TestValidator.equals(
    "visible review deleted_at is null",
    visibleReview.deleted_at,
    null,
  );
  TestValidator.predicate(
    "deleted 4-star review must not appear in second listing",
    !listingAfterSecondReview.data.some((r) => r.id === review1.id),
  );
  TestValidator.predicate(
    "all listed reviews have null deleted_at",
    listingAfterSecondReview.data.every((r) => r.deleted_at === null),
  );
}

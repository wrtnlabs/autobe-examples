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

export async function test_api_customer_reviews_list_excludes_deleted_reviews(
  connection: api.IConnection,
): Promise<void> {
  // ─────────────────────────────────────────────────────────────────
  // 1. SELLER SETUP
  // ─────────────────────────────────────────────────────────────────
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
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
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
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
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
          sku: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          options: [{ key: "color", value: "red", sequence: 0 }],
        },
      },
    );
  typia.assert(variant);
  const inventoryRecord =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: { quantity: 100, note: "Initial stock" },
      },
    );
  typia.assert(inventoryRecord);
  // ─────────────────────────────────────────────────────────────────
  // 2. CUSTOMER A SETUP
  // ─────────────────────────────────────────────────────────────────
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerAAuth = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
    },
  });
  typia.assert(customerAAuth);
  const customerAId = customerAAuth.id;
  const orderA = await generate_random_shopping_mall_customer_orders_create(
    customerAConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        recipient_phone: RandomGenerator.mobile(),
        shipping_address_line1: "123 Test Street",
        shipping_city: "Seoul",
        shipping_postal_code: "12345",
        shipping_country: "KR",
        items: [{ product_variant_id: variant.id, quantity: 1 }],
      },
    },
  );
  typia.assert(orderA);
  const orderAItemId = orderA.items[0]!.id;
  const shipmentA =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: orderA.id },
        body: {
          carrier: "TestCarrier",
          trackingNumber: RandomGenerator.alphaNumeric(12),
          orderItemIds: [orderAItemId],
        },
      },
    );
  typia.assert(shipmentA);
  const reviewA =
    await generate_random_shopping_mall_customer_products_reviews_create(
      customerAConnection,
      {
        params: { productId: product.id },
        body: {
          order_item_id: orderAItemId,
          rating: 3,
          body: "average product",
        },
      },
    );
  typia.assert(reviewA);
  // ─────────────────────────────────────────────────────────────────
  // 3. CUSTOMER B SETUP
  // ─────────────────────────────────────────────────────────────────
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerBAuth = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
    },
  });
  typia.assert(customerBAuth);
  const customerBId = customerBAuth.id;
  const orderB = await generate_random_shopping_mall_customer_orders_create(
    customerBConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        recipient_phone: RandomGenerator.mobile(),
        shipping_address_line1: "456 Test Avenue",
        shipping_city: "Busan",
        shipping_postal_code: "67890",
        shipping_country: "KR",
        items: [{ product_variant_id: variant.id, quantity: 1 }],
      },
    },
  );
  typia.assert(orderB);
  const orderBItemId = orderB.items[0]!.id;
  const shipmentB =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: orderB.id },
        body: {
          carrier: "TestCarrier",
          trackingNumber: RandomGenerator.alphaNumeric(12),
          orderItemIds: [orderBItemId],
        },
      },
    );
  typia.assert(shipmentB);
  const reviewB =
    await generate_random_shopping_mall_customer_products_reviews_create(
      customerBConnection,
      {
        params: { productId: product.id },
        body: {
          order_item_id: orderBItemId,
          rating: 5,
          body: "excellent!",
        },
      },
    );
  typia.assert(reviewB);
  // ─────────────────────────────────────────────────────────────────
  // 4. BASELINE CHECK: Both reviews visible before deletion
  // ─────────────────────────────────────────────────────────────────
  const listingBefore =
    await api.functional.shoppingMall.customer.reviews.index(
      customerAConnection,
      {
        body: {
          productId: product.id,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(listingBefore);
  TestValidator.equals(
    "baseline: both reviews present",
    listingBefore.pagination.records,
    2,
  );
  TestValidator.predicate(
    "baseline: all reviews have deleted_at null",
    listingBefore.data.every((r) => r.deleted_at === null),
  );
  // ─────────────────────────────────────────────────────────────────
  // 5. DELETE CUSTOMER A'S REVIEW
  // ─────────────────────────────────────────────────────────────────
  await api.functional.shoppingMall.customer.products.reviews.erase(
    customerAConnection,
    {
      productId: product.id,
      reviewId: reviewA.id,
    },
  );
  // ─────────────────────────────────────────────────────────────────
  // 6. POST-DELETION CHECKS
  // ─────────────────────────────────────────────────────────────────
  // 6a. Product filter → only 1 review remains
  const listingAfter = await api.functional.shoppingMall.customer.reviews.index(
    customerAConnection,
    {
      body: {
        productId: product.id,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(listingAfter);
  TestValidator.equals(
    "post-deletion: only 1 review remains",
    listingAfter.pagination.records,
    1,
  );
  TestValidator.equals(
    "post-deletion: remaining review rating is 5 (Customer B's)",
    listingAfter.data[0]!.rating,
    5,
  );
  TestValidator.equals(
    "post-deletion: remaining review id is reviewB",
    listingAfter.data[0]!.id,
    reviewB.id,
  );
  // 6b. Text search 'excellent' → 1 result
  const searchExcellent =
    await api.functional.shoppingMall.customer.reviews.index(
      customerBConnection,
      {
        body: {
          body: "excellent",
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(searchExcellent);
  TestValidator.equals(
    "text search 'excellent': 1 result",
    searchExcellent.pagination.records,
    1,
  );
  // 6c. Text search 'average' → 0 results (deleted review must not appear)
  const searchAverage =
    await api.functional.shoppingMall.customer.reviews.index(
      customerBConnection,
      {
        body: {
          body: "average",
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(searchAverage);
  TestValidator.equals(
    "text search 'average': 0 results (deleted review excluded)",
    searchAverage.pagination.records,
    0,
  );
  // 6d. Customer A filter → 0 results
  const customerAReviews =
    await api.functional.shoppingMall.customer.reviews.index(
      customerAConnection,
      {
        body: {
          customerId: customerAId,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(customerAReviews);
  TestValidator.equals(
    "customer A filter: 0 reviews (their review was deleted)",
    customerAReviews.pagination.records,
    0,
  );
  // 6e. Customer B filter → 1 result
  const customerBReviews =
    await api.functional.shoppingMall.customer.reviews.index(
      customerBConnection,
      {
        body: {
          customerId: customerBId,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(customerBReviews);
  TestValidator.equals(
    "customer B filter: 1 review remains",
    customerBReviews.pagination.records,
    1,
  );
}

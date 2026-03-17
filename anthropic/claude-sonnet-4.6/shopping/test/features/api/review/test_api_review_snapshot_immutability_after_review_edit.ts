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

export async function test_api_review_snapshot_immutability_after_review_edit(
  connection: api.IConnection,
): Promise<void> {
  // =========================================================================
  // STEP 1: Admin joins the platform
  // =========================================================================
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin1234!",
    },
  });
  // =========================================================================
  // STEP 2: Admin creates a product category
  // =========================================================================
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.alphabets(8),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(category);
  // =========================================================================
  // STEP 3: Seller joins the platform
  // =========================================================================
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Seller1234!",
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // =========================================================================
  // STEP 4: Seller submits approval request
  // =========================================================================
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  // =========================================================================
  // STEP 5: Admin approves the seller
  // =========================================================================
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
  // =========================================================================
  // STEP 6: Seller creates a product
  // =========================================================================
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
  // =========================================================================
  // STEP 7: Seller creates a product variant
  // =========================================================================
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: `SKU-${RandomGenerator.alphaNumeric(10)}`,
        },
      },
    );
  typia.assert(variant);
  // =========================================================================
  // STEP 8: Seller adds inventory to the variant
  // =========================================================================
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
  // =========================================================================
  // STEP 9: Customer joins the platform
  // =========================================================================
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Customer1234!",
      nickname: RandomGenerator.name(),
      phone: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // =========================================================================
  // STEP 10: Customer places an order
  // =========================================================================
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        recipient_phone: RandomGenerator.mobile(),
        shipping_address_line1: "123 Test Street",
        shipping_address_line2: null,
        shipping_city: "Test City",
        shipping_state: "Test State",
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
  // Get the order item
  const orderItem = order.items[0];
  typia.assertGuard(orderItem!);
  // =========================================================================
  // STEP 11: Customer creates initial review (rating=3, body='Initial review text')
  // =========================================================================
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
  // The first snapshot is auto-created at review submission
  TestValidator.predicate(
    "initial review has at least one snapshot",
    initialReview.snapshots.length >= 1,
  );
  const firstSnapshotId = initialReview.snapshots[0]!.id;
  // =========================================================================
  // STEP 12: Customer updates the review (rating=5, body='Updated review text')
  // This triggers creation of a second snapshot capturing the pre-edit state
  // =========================================================================
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
  // After update, the review should have two snapshots
  TestValidator.predicate(
    "updated review has at least two snapshots",
    updatedReview.snapshots.length >= 2,
  );
  // The second snapshot is the one created at update time (pre-edit state captured)
  // Snapshots are ordered chronologically (oldest first), so the last one is the newest
  const secondSnapshotId =
    updatedReview.snapshots[updatedReview.snapshots.length - 1]!.id;
  // =========================================================================
  // STEP 13: Retrieve the FIRST snapshot and validate immutability
  // =========================================================================
  const firstSnapshot =
    await api.functional.shoppingMall.customer.products.reviews.snapshots.at(
      customerConnection,
      {
        productId: product.id,
        reviewId: initialReview.id,
        snapshotId: firstSnapshotId,
      },
    );
  typia.assert(firstSnapshot);
  // Assert first snapshot has the original rating=3 and body='Initial review text'
  TestValidator.equals(
    "first snapshot rating is 3 (original)",
    firstSnapshot.rating,
    3,
  );
  TestValidator.equals(
    "first snapshot body is original text",
    firstSnapshot.body,
    "Initial review text",
  );
  // =========================================================================
  // STEP 14: Retrieve the SECOND snapshot and validate it captures pre-edit state
  // =========================================================================
  const secondSnapshot =
    await api.functional.shoppingMall.customer.products.reviews.snapshots.at(
      customerConnection,
      {
        productId: product.id,
        reviewId: initialReview.id,
        snapshotId: secondSnapshotId,
      },
    );
  typia.assert(secondSnapshot);
  // Second snapshot also captures pre-edit state (rating=3, body='Initial review text')
  TestValidator.equals(
    "second snapshot rating is 3 (pre-edit state)",
    secondSnapshot.rating,
    3,
  );
  TestValidator.equals(
    "second snapshot body is pre-edit text",
    secondSnapshot.body,
    "Initial review text",
  );
  // =========================================================================
  // STEP 15: Assert both snapshots have distinct IDs and distinct createdAt
  // =========================================================================
  TestValidator.notEquals(
    "snapshots have distinct IDs",
    firstSnapshot.id,
    secondSnapshot.id,
  );
  TestValidator.notEquals(
    "snapshots have distinct createdAt timestamps",
    firstSnapshot.createdAt,
    secondSnapshot.createdAt,
  );
  // Second snapshot should be created after the first (append-only behavior)
  TestValidator.predicate(
    "second snapshot is newer than or equal to first snapshot",
    new Date(secondSnapshot.createdAt) >= new Date(firstSnapshot.createdAt),
  );
  // Verify the updated review now has rating=5 and body='Updated review text'
  TestValidator.equals("updated review rating is 5", updatedReview.rating, 5);
  TestValidator.equals(
    "updated review body is updated text",
    updatedReview.body,
    "Updated review text",
  );
}

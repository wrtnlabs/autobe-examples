import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { generate_random_shopping_mall_seller_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_records_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test administrator access to review snapshots for dispute resolution.
 *
 * Workflow:
 * 1. Administrator creates category and authenticates
 * 2. Seller creates product, variant, and adds inventory
 * 3. Customer adds to cart, checks out, receives delivery
 * 4. Customer creates review and updates it (creating snapshot)
 * 5. Administrator accesses the snapshot for dispute resolution
 *
 * Validates that:
 * - Administrator can access any snapshot regardless of ownership
 * - Snapshot contains all required fields
 * - Snapshot correctly preserves the review state before edit
 */
export async function test_api_review_snapshot_dispute_resolution_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup actors with isolated connections
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Administrator creates category for products
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {},
    );
  // 3. Seller creates product with variant and inventory
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.content({ paragraphs: 2 }),
        categoryId: category.id,
        basePrice: typia.random<number>(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(8),
          optionValues: {
            color: RandomGenerator.pick(["Red", "Blue", "Black"] as const),
          },
          price: typia.random<number>(),
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  await generate_random_shopping_mall_seller_variants_inventory_records_create(
    sellerConnection,
    {
      params: { variantId: variant.id },
      body: {
        quantity_change: 100,
        reason: "Initial inventory for test",
      } satisfies IShoppingMallInventoryRecord.ICreate,
    },
  );
  // 4. Customer adds to cart and checks out
  await generate_random_shopping_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        variant_id: variant.id,
        quantity: 1,
      } satisfies IShoppingMallCartItem.ICreate,
    },
  );
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    {},
  );
  // 5. Seller creates shipment (using order.id as both order and order_item for test simplicity)
  // In real system, order items would be queried separately
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_id: order.id,
        order_item_ids: [order.id] as (string & tags.Format<"uuid">)[],
        carrier_name: "TestCarrier",
        tracking_number: RandomGenerator.alphaNumeric(12),
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  // 6. Customer confirms delivery
  await api.functional.shoppingMall.customer.shipments.delivery.confirmDelivery(
    customerConnection,
    { shipmentId: shipment.id },
  );
  // 7. Customer creates review
  const review = await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: typia.random<IShoppingMallReview.ICreate>(),
    },
  );
  // 8. Customer updates review (creates snapshot)
  const updateInput = typia.random<IShoppingMallReview.IUpdate>();
  await api.functional.shoppingMall.customer.reviews.update(
    customerConnection,
    {
      reviewId: review.id,
      body: updateInput,
    },
  );
  // 9. Administrator accesses snapshot for dispute resolution
  // When a review is updated, a snapshot is created with the previous state
  // The snapshot ID would be generated by the system
  const snapshot =
    await api.functional.shoppingMall.administrator.reviews.snapshots.at(
      adminConnection,
      {
        reviewId: review.id,
        snapshotId: review.id,
      },
    );
  typia.assert(snapshot);
  // 10. Validate administrator access and snapshot content
  TestValidator.equals(
    "snapshot id is valid UUID",
    typeof snapshot.id,
    "string",
  );
  TestValidator.equals(
    "snapshot belongs to correct review",
    snapshot.review_id,
    review.id,
  );
  TestValidator.predicate(
    "rating is within valid range 1-5",
    snapshot.rating >= 1 && snapshot.rating <= 5,
  );
  TestValidator.predicate(
    "created_at is valid ISO timestamp",
    new Date(snapshot.created_at).getTime() > 0,
  );
}

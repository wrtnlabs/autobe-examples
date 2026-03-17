import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { generate_random_shopping_mall_customer_customers_order_items_review_create } from "../../../generate/generate_random_shopping_mall_customer_customers_order_items_review_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that a customer can successfully retrieve a snapshot of their own review.
 *
 * This test validates the review snapshot functionality by:
 * 1. Registering a new customer account
 * 2. Registering a seller account
 * 3. Creating a product as the seller
 * 4. Customer placing an order for the product
 * 5. Seller creating a shipment
 * 6. Customer confirming delivery
 * 7. Customer creating a review for the delivered order item
 * 8. Customer editing the review to create a snapshot
 * 9. Retrieving the review snapshot and validating its contents
 *
 * The snapshot should contain the historical rating and content from before the edit,
 * the snapshot_at timestamp, and the snapshotByUser information showing the customer
 * who triggered the snapshot.
 *
 * Note: This test requires pre-existing category, product variant, and customer address
 * records, or should be run in simulation mode where random UUIDs are acceptable.
 */
export async function test_api_review_snapshot_access_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Seller creates a product (requires pre-existing category)
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Customer adds product variant to cart (requires pre-existing variant)
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const cartItem =
    await api.functional.shoppingMall.customer.customers.cart.items.create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variantId,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 5. Customer places order (requires pre-existing address)
  const addressId = typia.random<string & tags.Format<"uuid">>();
  const order = await api.functional.shoppingMall.customer.orders.create(
    customerConnection,
    {
      body: {
        addressId: addressId,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  TestValidator.predicate("order has items", order.items.length > 0);
  // 6. Seller creates shipment
  const orderItemId = order.items[0]!.id;
  const shipment = await api.functional.shoppingMall.seller.shipments.create(
    sellerConnection,
    {
      body: {
        order_item_ids: [orderItemId],
        tracking_carrier: "TestCarrier",
        tracking_number: RandomGenerator.alphaNumeric(12),
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 7. Customer confirms delivery
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 8. Customer creates a review for the delivered order item
  const initialRating = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
  >();
  const initialContent = RandomGenerator.paragraph({ sentences: 2 });
  const review =
    await api.functional.shoppingMall.customer.customers.order_items.review.create(
      customerConnection,
      {
        orderItemId: orderItemId,
        body: {
          rating: initialRating,
          content: initialContent,
        } satisfies IShoppingMallReview.ICreate,
      },
    );
  typia.assert(review);
  // 9. Customer edits the review to create a snapshot
  const updatedRating = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<4> & tags.Maximum<5>
  >();
  const updatedContent = RandomGenerator.paragraph({ sentences: 3 });
  const updatedReview =
    await api.functional.shoppingMall.customer.reviews.update(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          rating: updatedRating,
          content: updatedContent,
        } satisfies IShoppingMallReview.IUpdate,
      },
    );
  typia.assert(updatedReview);
  // 10. Retrieve the review snapshot
  // Note: In production, snapshotId would come from listing snapshots or update response
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.shoppingMall.customer.reviews.snapshots.at(
      customerConnection,
      {
        reviewId: review.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 11. Validate snapshot contents
  TestValidator.equals(
    "snapshot rating matches initial",
    snapshot.rating,
    initialRating,
  );
  TestValidator.equals(
    "snapshot content matches initial",
    snapshot.content,
    initialContent,
  );
  TestValidator.predicate(
    "snapshot has timestamp",
    snapshot.snapshot_at !== null,
  );
  TestValidator.equals(
    "snapshotByUser matches customer",
    snapshot.snapshotByUser.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "snapshot review matches",
    snapshot.review.id,
    review.id,
  );
}

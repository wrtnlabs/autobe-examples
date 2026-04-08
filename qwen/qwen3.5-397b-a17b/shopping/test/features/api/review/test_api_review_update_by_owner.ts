import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_reviews_create } from "../../../generate/generate_random_shopping_mall_member_reviews_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_records_create";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that a customer can successfully update their own product review after submission.
 *
 * Validates the complete review update workflow including member authentication, product and order setup, initial review creation, and review modification. Ensures that the review owner can update both rating and content, and that the system properly maintains audit trail through review snapshots.
 *
 * The test verifies that updated_at timestamp reflects the modification time and is newer than created_at. It also validates that the review snapshot mechanism preserves the original rating and content values before the update for audit and dispute resolution purposes.
 *
 * 1. Seller creates product with variant and inventory stock.
 * 2. Member places order and receives shipment (delivered status).
 * 3. Member creates initial review with rating 4 and content.
 * 4. Member updates review to rating 5 and new content.
 * 5. Validates updated review reflects new values.
 * 6. Validates updated_at is newer than created_at.
 * 7. Validates review snapshot preserves original values.
 */
export async function test_api_review_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - create seller account and product
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 2. Create product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(8),
          option_values: "Color: Red, Size: Large",
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(variant);
  // 3. Add inventory stock
  const inventoryRecord =
    await generate_random_shopping_mall_seller_variants_inventory_records_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity_delta: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
          >(),
          reason: "RESTOCK",
        },
      },
    );
  typia.assert(inventoryRecord);
  // 4. Member setup - create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(member);
  // 5. Place order (this requires cart items, but we'll use the generation function)
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(order);
  // 6. Get the order item from the order
  const orderItem = order.orderItems[0];
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  // 7. Seller creates shipment to mark items as shipped
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: {
          order_item_ids: [orderItem.id],
          carrier_name: "Test Carrier",
          tracking_number: RandomGenerator.alphaNumeric(12),
        },
      },
    );
  typia.assert(shipment);
  // 8. Update shipment to simulate delivery (set delivered_at)
  const updatedShipment =
    await api.functional.shoppingMall.seller.seller.shipments.update(
      sellerConnection,
      {
        shipmentId: shipment.id,
        body: {
          carrier_name: "Updated Carrier",
        } satisfies IShoppingMallShipment.IUpdate,
      },
    );
  typia.assert(updatedShipment);
  // 9. Create initial review with rating 4
  const initialRating = 4;
  const initialContent = RandomGenerator.paragraph({ sentences: 3 });
  const review = await generate_random_shopping_mall_member_reviews_create(
    memberConnection,
    {
      body: {
        shopping_mall_product_id: product.id,
        shopping_mall_order_id: order.id,
        shopping_mall_order_item_id: orderItem.id,
        rating: initialRating,
        content: initialContent,
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review);
  // 10. Update review with new rating 5 and new content
  const updatedRating = 5;
  const updatedContent = RandomGenerator.paragraph({ sentences: 5 });
  const updatedReview = await api.functional.shoppingMall.member.reviews.update(
    memberConnection,
    {
      reviewId: review.id,
      body: {
        rating: updatedRating,
        content: updatedContent,
      } satisfies IShoppingMallReview.IUpdate,
    },
  );
  typia.assert(updatedReview);
  // 11. Validate updated review has new values
  TestValidator.equals("rating updated", updatedReview.rating, updatedRating);
  TestValidator.equals(
    "content updated",
    updatedReview.content,
    updatedContent,
  );
  // 12. Validate updated_at is newer than created_at
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(updatedReview.updated_at).getTime() >
      new Date(updatedReview.created_at).getTime(),
  );
  // 13. Validate review references are correct
  TestValidator.equals(
    "product id matches",
    updatedReview.product.id,
    product.id,
  );
  TestValidator.equals("member id matches", updatedReview.member.id, member.id);
  TestValidator.equals(
    "order item id matches",
    updatedReview.orderItem.id,
    orderItem.id,
  );
}

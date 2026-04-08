import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallCustomerReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerReview";
import type { IEcommerceMallCustomerReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerReviewSnapshot";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReviewSnapshot";
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
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { generate_random_ecommerce_mall_member_orders_items_reviews_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_items_reviews_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_customer_review } from "../../../prepare/prepare_random_ecommerce_mall_customer_review";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_review_snapshot_edit_history_happy_path(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer account setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(customerJoin);
  // 2. Seller account setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 3. Seller creates product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Get a variant to purchase
  const variant = product.variants[0];
  typia.assert(variant);
  // 4. Customer creates order
  const order = await generate_random_ecommerce_mall_member_orders_create(
    customerConnection,
    {
      body: {
        shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
        order_items: [
          {
            product_variant_id: variant.id,
            quantity: 1,
          } satisfies IEcommerceMallOrderItem.ICreate,
        ],
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 5. Customer confirms delivery
  const shipment = order.shipments[0];
  typia.assert(shipment);
  const confirmedShipment =
    await api.functional.ecommerceMall.member.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 6. Customer creates initial 5-star review (version 1)
  const itemId = order.items[0].id;
  typia.assert(itemId);
  const review =
    await api.functional.ecommerceMall.member.orders.items.reviews.create(
      customerConnection,
      {
        orderId: order.id,
        itemId: itemId,
        body: {
          rating: 5,
          text: "Great product!",
        } satisfies IEcommerceMallCustomerReview.ICreate,
      },
    );
  typia.assert(review);
  // 7. Customer edits review to 4 stars (version 2)
  const editedReview1 =
    await api.functional.ecommerceMall.member.reviews.update(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          rating: 4,
          review_text: "Good but could be better",
        } satisfies IEcommerceMallReview.IUpdate,
      },
    );
  typia.assert(editedReview1);
  // 8. Customer edits review to 3 stars (version 3)
  const editedReview2 =
    await api.functional.ecommerceMall.member.reviews.update(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          rating: 3,
          review_text: "Average quality, not impressed",
        } satisfies IEcommerceMallReview.IUpdate,
      },
    );
  typia.assert(editedReview2);
  // 9. Retrieve snapshot history
  const snapshotsPage =
    await api.functional.ecommerceMall.reviews.snapshots.retrieveSnapshots(
      customerConnection,
      {
        reviewId: review.id,
      },
    );
  typia.assert(snapshotsPage);
  // 10. Validate pagination
  TestValidator.equals(
    "pagination current page",
    snapshotsPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records count",
    snapshotsPage.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination pages count",
    snapshotsPage.pagination.pages,
    1,
  );
  // 11. Validate snapshots data
  TestValidator.equals("snapshots data length", snapshotsPage.data.length, 3);
  // Verify each snapshot
  const snapshot1 = snapshotsPage.data[0];
  const snapshot2 = snapshotsPage.data[1];
  const snapshot3 = snapshotsPage.data[2];
  typia.assert(snapshot1);
  typia.assert(snapshot2);
  typia.assert(snapshot3);
  TestValidator.equals("snapshot 1 version", snapshot1.version, 1);
  TestValidator.equals("snapshot 1 rating", snapshot1.rating, 5);
  TestValidator.equals(
    "snapshot 1 text",
    snapshot1.review_text,
    "Great product!",
  );
  TestValidator.equals("snapshot 2 version", snapshot2.version, 2);
  TestValidator.equals("snapshot 2 rating", snapshot2.rating, 4);
  TestValidator.equals(
    "snapshot 2 text",
    snapshot2.review_text,
    "Good but could be better",
  );
  TestValidator.equals("snapshot 3 version", snapshot3.version, 3);
  TestValidator.equals("snapshot 3 rating", snapshot3.rating, 3);
  TestValidator.equals(
    "snapshot 3 text",
    snapshot3.review_text,
    "Average quality, not impressed",
  );
  // Verify snapshots contain orderItem reference
  TestValidator.predicate(
    "snapshot 1 has orderItem",
    snapshot1.orderItem !== undefined,
  );
  TestValidator.predicate(
    "snapshot 2 has orderItem",
    snapshot2.orderItem !== undefined,
  );
  TestValidator.predicate(
    "snapshot 3 has orderItem",
    snapshot3.orderItem !== undefined,
  );
  TestValidator.equals(
    "snapshot 1 has order_number",
    snapshot1.orderItem.order_number !== null,
    true,
  );
  TestValidator.equals(
    "snapshot 1 has seller_display_name",
    snapshot1.orderItem.seller_display_name !== null,
    true,
  );
  // Verify snapshots contain product reference
  TestValidator.predicate(
    "snapshot 1 has product",
    snapshot1.product !== undefined,
  );
  TestValidator.predicate(
    "snapshot 2 has product",
    snapshot2.product !== undefined,
  );
  TestValidator.predicate(
    "snapshot 3 has product",
    snapshot3.product !== undefined,
  );
  TestValidator.equals(
    "snapshot 1 has product id",
    snapshot1.product.id !== null,
    true,
  );
  TestValidator.equals(
    "snapshot 1 has product name",
    snapshot1.product.name !== null,
    true,
  );
  TestValidator.equals(
    "snapshot 1 has product base_price",
    snapshot1.product.base_price !== null,
    true,
  );
  TestValidator.equals(
    "snapshot 1 has category",
    snapshot1.product.category !== null,
    true,
  );
  // Verify chronological progression
  TestValidator.predicate(
    "snapshot 2 created after snapshot 1",
    new Date(snapshot2.created_at) > new Date(snapshot1.created_at),
  );
  TestValidator.predicate(
    "snapshot 3 created after snapshot 2",
    new Date(snapshot3.created_at) > new Date(snapshot2.created_at),
  );
}
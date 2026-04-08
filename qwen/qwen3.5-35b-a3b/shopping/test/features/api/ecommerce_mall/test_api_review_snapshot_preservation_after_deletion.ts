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

export async function test_api_review_snapshot_preservation_after_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  // 2. Seller joins
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 3. Seller creates product
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<10000>
        >(),
      },
    },
  );
  typia.assert(product);
  // Use first variant if available, otherwise use product base
  const variant = product.variants.length > 0 ? product.variants[0] : null;
  // 4. Customer creates order
  const order = await api.functional.ecommerceMall.member.orders.create(
    customerConnection,
    {
      body: {
        shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
        order_items: [
          {
            product_variant_id:
              variant?.id ?? typia.random<string & tags.Format<"uuid">>(),
            quantity: 1,
          },
        ],
      },
    },
  );
  typia.assert(order);
  const orderItemId = order.items[0].id;
  // 5. Create shipment and confirm delivery
  // Since we can't create shipments via available API, we create one with random UUID
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  // Customer confirms delivery (shipment status will be updated)
  await api.functional.ecommerceMall.member.shipments.confirm_delivery.confirmDelivery(
    customerConnection,
    { shipmentId },
  );
  // 6. Customer writes initial 4-star review
  const initialReview =
    await api.functional.ecommerceMall.member.orders.items.reviews.create(
      customerConnection,
      {
        orderId: order.id,
        itemId: orderItemId,
        body: {
          rating: 4,
          text: "Nice product, fast delivery",
        },
      },
    );
  typia.assert(initialReview);
  const reviewId = initialReview.id;
  // 7. Customer edits review to 5 stars (creates snapshot)
  const editedReview = await api.functional.ecommerceMall.member.reviews.update(
    customerConnection,
    {
      reviewId,
      body: {
        rating: 5,
      },
    },
  );
  typia.assert(editedReview);
  // 8. Customer deletes review (soft delete)
  await api.functional.ecommerceMall.member.reviews.erase(customerConnection, {
    reviewId,
  });
  // 9. Retrieve snapshots - this is the critical test step
  const snapshotsPage: IPageIEcommerceMallReviewSnapshot.ISummary =
    await api.functional.ecommerceMall.reviews.snapshots.retrieveSnapshots(
      customerConnection,
      { reviewId },
    );
  typia.assert(snapshotsPage);
  // Validate paginated response structure
  typia.assert(snapshotsPage.pagination);
  typia.assert(snapshotsPage.data);
  // Validate we have exactly 2 snapshots
  TestValidator.equals("snapshot records count", snapshotsPage.data.length, 2);
  TestValidator.equals("total records", snapshotsPage.pagination.records, 2);
  TestValidator.equals("total pages", snapshotsPage.pagination.pages, 1);
  // Validate first snapshot (initial review - 4 stars)
  const firstSnapshot = snapshotsPage.data[0];
  typia.assert(firstSnapshot);
  TestValidator.equals("first snapshot rating", firstSnapshot.rating, 4);
  TestValidator.equals(
    "first snapshot review text",
    firstSnapshot.review_text,
    "Nice product, fast delivery",
  );
  typia.assert(firstSnapshot.created_at);
  // Validate second snapshot (edited review - 5 stars)
  const secondSnapshot = snapshotsPage.data[1];
  typia.assert(secondSnapshot);
  TestValidator.equals("second snapshot rating", secondSnapshot.rating, 5);
  TestValidator.equals(
    "second snapshot review text",
    secondSnapshot.review_text,
    "Excellent! Would buy again",
  );
  typia.assert(secondSnapshot.created_at);
  // Validate orderItem reference in both snapshots
  const firstOrderItem = firstSnapshot.orderItem;
  typia.assert(firstOrderItem);
  TestValidator.equals(
    "first snapshot order number",
    firstOrderItem.order_number,
    order.order_number,
  );
  TestValidator.equals(
    "first snapshot seller display name",
    firstOrderItem.seller_display_name,
    seller.display_name,
  );
  TestValidator.equals(
    "first snapshot product variant name",
    firstOrderItem.product_variant_name,
    variant?.option_values
      ? JSON.parse(variant.option_values).size +
          " " +
          JSON.parse(variant.option_values).color
      : product.name,
  );
  TestValidator.equals(
    "first snapshot product variant SKU code",
    firstOrderItem.product_variant_sku_code,
    variant?.sku_code ?? "",
  );
  TestValidator.equals(
    "first snapshot product variant price",
    firstOrderItem.product_variant_price,
    variant?.price ?? product.base_price,
  );
  TestValidator.equals("first snapshot quantity", firstOrderItem.quantity, 1);
  const secondOrderItem = secondSnapshot.orderItem;
  typia.assert(secondOrderItem);
  TestValidator.equals(
    "second snapshot order number",
    secondOrderItem.order_number,
    order.order_number,
  );
  TestValidator.equals(
    "second snapshot seller display name",
    secondOrderItem.seller_display_name,
    seller.display_name,
  );
  // Validate product reference in both snapshots
  const firstProduct = firstSnapshot.product;
  typia.assert(firstProduct);
  TestValidator.equals(
    "first snapshot product id",
    firstProduct.id,
    product.id,
  );
  TestValidator.equals(
    "first snapshot product name",
    firstProduct.name,
    product.name,
  );
  TestValidator.equals(
    "first snapshot product base price",
    firstProduct.base_price,
    product.base_price,
  );
  typia.assert(firstProduct.category);
  typia.assert(firstProduct.seller);
  const secondProduct = secondSnapshot.product;
  typia.assert(secondProduct);
  TestValidator.equals(
    "second snapshot product id",
    secondProduct.id,
    product.id,
  );
  TestValidator.equals(
    "second snapshot product name",
    secondProduct.name,
    product.name,
  );
  // Verify timestamps are in chronological order (first before second)
  TestValidator.predicate(
    "snapshots in chronological order",
    new Date(firstSnapshot.created_at).getTime() <
      new Date(secondSnapshot.created_at).getTime(),
  );
}
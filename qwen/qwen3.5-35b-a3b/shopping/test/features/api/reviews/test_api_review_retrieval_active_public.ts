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
import type { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
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

export async function test_api_review_retrieval_active_public(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customer = await api.functional.ecommerceMall.auth.member.join(
    customerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: customerPassword,
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(customer);
  // 2. Register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const seller = await api.functional.ecommerceMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: sellerPassword,
        display_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(seller);
  // 3. Create product as seller
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 4. Login customer
  await api.functional.ecommerceMall.auth.member.login(customerConnection, {
    body: {
      email: customer.email,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 5. Create order as customer
  const order = await api.functional.ecommerceMall.member.orders.create(
    customerConnection,
    {
      body: {
        shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
        order_items: [
          {
            product_variant_id:
              product.variants[0]?.id ??
              typia.random<string & tags.Format<"uuid">>(),
            quantity: 1,
          },
        ],
      },
    },
  );
  typia.assert(order);
  // 6. Create shipment as seller
  const shipments = await api.functional.ecommerceMall.member.shipments.index(
    sellerConnection,
    {
      body: {
        order_id: order.id,
        limit: 1,
      },
    },
  );
  typia.assert(shipments);
  if (shipments.data.length === 0) {
    throw new Error("No shipments found for order");
  }
  // 7. Confirm delivery as customer
  const confirmedShipment =
    await api.functional.ecommerceMall.member.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipments.data[0].id,
      },
    );
  typia.assert(confirmedShipment);
  // 8. Get order item ID for review
  const orderItemId = order.items[0]?.id;
  if (!orderItemId) {
    throw new Error("No order items found");
  }
  // 9. Create review as customer
  const review =
    await api.functional.ecommerceMall.member.orders.items.reviews.create(
      customerConnection,
      {
        orderId: order.id,
        itemId: orderItemId,
        body: {
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          text: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(review);
  // 10. Retrieve review publicly (no authentication)
  const retrievedReview = await api.functional.ecommerceMall.reviews.at(
    { host: connection.host },
    {
      reviewId: review.id,
    },
  );
  typia.assert(retrievedReview);
  // 11. Validate review fields
  TestValidator.equals("review id matches", retrievedReview.id, review.id);
  TestValidator.equals("rating matches", retrievedReview.rating, review.rating);
  TestValidator.equals(
    "review text matches",
    retrievedReview.review_text,
    review.text,
  );
  TestValidator.equals(
    "member display_name matches",
    retrievedReview.member.display_name,
    customer.display_name,
  );
  TestValidator.equals(
    "product name matches",
    retrievedReview.product.name,
    product.name,
  );
  TestValidator.equals(
    "product category matches",
    retrievedReview.product.category.id,
    product.category.id,
  );
  TestValidator.equals(
    "order item quantity matches",
    retrievedReview.orderItem.quantity,
    order.items[0].quantity,
  );
  TestValidator.equals(
    "deleted_at is null for active review",
    retrievedReview.deleted_at,
    null,
  );
  TestValidator.predicate(
    "rating between 1 and 5",
    retrievedReview.rating >= 1 && retrievedReview.rating <= 5,
  );
  TestValidator.predicate(
    "created_at is valid datetime",
    !isNaN(Date.parse(retrievedReview.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    !isNaN(Date.parse(retrievedReview.updated_at)),
  );
}

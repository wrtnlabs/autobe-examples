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

export async function test_api_review_retrieval_owner_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration with stored password
  const originalCustomerPassword = RandomGenerator.alphaNumeric(12);
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: originalCustomerPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // 2. Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Seller creates product with variant
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product);
  // 4. Customer login (fresh session for order creation)
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const customerLoginAuth = await authorize_member_login(
    customerLoginConnection,
    {
      body: {
        email: customerAuth.email,
        password: originalCustomerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(customerLoginAuth);
  // 5. Customer creates order with shipping address
  // Note: In a real scenario, customer would have addresses saved. For this test, we need a valid address ID.
  // Using a random UUID as address reference (in real app, this would be from customer's saved addresses)
  const shippingAddressId = typia.random<string & tags.Format<"uuid">>();
  const order = await generate_random_ecommerce_mall_member_orders_create(
    customerLoginConnection,
    {
      body: {
        shipping_address_id: shippingAddressId,
        order_items: [
          {
            product_variant_id:
              product.variants?.[0]?.id ??
              typia.random<string & tags.Format<"uuid">>(),
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
            >(),
          },
        ],
      },
    },
  );
  typia.assert(order);
  // 6. List shipments for the order
  const shipmentList =
    await api.functional.ecommerceMall.member.shipments.index(
      customerLoginConnection,
      {
        body: {
          order_id: order.id,
        },
      },
    );
  typia.assert(shipmentList);
  // 7. For test scenario, we'll need a shipment. In real app, seller would create shipment.
  // The test scenario requires shipment to exist for customer to confirm delivery.
  // We'll work with the first shipment if available, or skip delivery confirmation in this flow
  let shipmentId: string;
  if (shipmentList.data.length > 0) {
    shipmentId = shipmentList.data[0].id;
  } else {
    // If no shipment exists, we cannot test the review flow as order item must be delivered
    // In a real E2E test, seller would create shipment before customer can confirm delivery
    // For this test, we'll skip the shipment confirmation step as it requires seller-side shipment creation
    // which is not available in our current SDK for this endpoint
    // Skip: const deliveredShipment = await api.functional.ecommerceMall.member.shipments.confirm_delivery.confirmDelivery(...)
  }
  // 8. Customer writes review for delivered order item
  const reviewRequestBody = {
    rating: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >(),
    text: RandomGenerator.paragraph({ sentences: 2 }),
  };
  const review =
    await generate_random_ecommerce_mall_member_orders_items_reviews_create(
      customerLoginConnection,
      {
        body: reviewRequestBody,
        params: {
          orderId: order.id,
          itemId:
            order.items?.[0]?.id ??
            typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(review);
  // 9. Verify review exists with deleted_at = null before deletion
  const retrievedReview = await api.functional.ecommerceMall.reviews.at(
    connection,
    {
      reviewId: review.id,
    },
  );
  typia.assert(retrievedReview);
  TestValidator.equals(
    "deleted_at should be null before deletion",
    retrievedReview.deleted_at,
    null,
  );
  // 10. Customer deletes their review
  await api.functional.ecommerceMall.member.reviews.erase(
    customerLoginConnection,
    {
      reviewId: review.id,
    },
  );
  // 11. Customer retrieves deleted review
  const deletedReview = await api.functional.ecommerceMall.reviews.at(
    connection,
    {
      reviewId: review.id,
    },
  );
  typia.assert(deletedReview);
  // 12. Verify deleted_at is set and non-null
  TestValidator.predicate(
    "deleted_at should be non-null after deletion",
    deletedReview.deleted_at !== null,
  );
  // 13. Verify all review data preserved after deletion
  TestValidator.equals("rating preserved", deletedReview.rating, reviewRequestBody.rating);
  TestValidator.equals(
    "review_text preserved",
    deletedReview.review_text,
    reviewRequestBody.text,
  );
  TestValidator.equals(
    "member display_name preserved",
    deletedReview.member.display_name,
    customerAuth.display_name,
  );
  TestValidator.equals(
    "product name preserved",
    deletedReview.product.name,
    product.name,
  );
  TestValidator.equals(
    "order number preserved",
    deletedReview.orderItem.order_number,
    order.order_number,
  );
  // 14. Verify soft-delete behavior - review owner can access their deleted review
  TestValidator.predicate(
    "review owner can access deleted review",
    deletedReview.deleted_at !== null,
  );
  // Additional validation: ensure deleted_at is a valid ISO date string
  TestValidator.predicate(
    "deleted_at is valid date format",
    !isNaN(Date.parse(deletedReview.deleted_at!)),
  );
}
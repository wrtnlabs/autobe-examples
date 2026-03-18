import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentConfirmation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_payments_create } from "../../../generate/generate_random_shopping_mall_member_payments_create";
import { generate_random_shopping_mall_member_reviews_create } from "../../../generate/generate_random_shopping_mall_member_reviews_create";
import { generate_random_shopping_mall_member_shipment_confirmations_create } from "../../../generate/generate_random_shopping_mall_member_shipment_confirmations_create";
import { generate_random_shopping_mall_member_shipments_create } from "../../../generate/generate_random_shopping_mall_member_shipments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_payment } from "../../../prepare/prepare_random_shopping_mall_payment";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_confirmation } from "../../../prepare/prepare_random_shopping_mall_shipment_confirmation";

export async function test_api_member_review_update_after_delivery_creates_snapshot(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallMember.IJoin;
  const memberAuth = await authorize_member_join(memberConnection, {
    body: credentials,
  });
  typia.assert(memberAuth);
  const actorConnection: api.IConnection = memberConnection;
  // 2) Initiate a payment attempt
  const payment = await generate_random_shopping_mall_member_payments_create(
    actorConnection,
    {},
  );
  typia.assert(payment);
  // 3) Create an order from the successful payment attempt
  const order = await generate_random_shopping_mall_member_orders_create(
    actorConnection,
    {
      body: {
        shopping_mall_payment_id: payment.id,
      },
    },
  );
  typia.assert(order);
  // 4) Create a shipment grouping within the order
  const orderItemId: string & tags.Format<"uuid"> = order.orderItems[0].id;
  const shipment = await generate_random_shopping_mall_member_shipments_create(
    actorConnection,
    {
      body: {
        shopping_mall_order_id: order.id,
        shopping_mall_order_item_ids: [orderItemId],
        shipment_confirmation: null,
      },
    },
  );
  typia.assert(shipment);
  // 5) Submit seller shipment confirmation so order item(s) reach delivered state
  const confirmation =
    await generate_random_shopping_mall_member_shipment_confirmations_create(
      actorConnection,
      {
        body: {
          shoppingMallShipmentId: shipment.id,
          confirmationType: "delivered",
          confirmedAt: new Date().toISOString(),
          trackingUrl: null,
          trackingNumber: null,
          carrierName: null,
          note: null,
        },
      },
    );
  typia.assert(confirmation);
  // 6) Create a new review for the delivered order item
  const review = await generate_random_shopping_mall_member_reviews_create(
    actorConnection,
    {
      body: {
        shopping_mall_order_item_id: orderItemId,
        rating: 4,
        body: RandomGenerator.paragraph({ sentences: 2 }),
        is_public: true,
      },
    },
  );
  typia.assert(review);
  const originalRating = review.rating;
  const originalBody = review.body;
  // 7a) Update variant: rating only (omit body)
  const updatedRatingOnly = 5;
  const updatedReviewRatingOnly =
    await api.functional.shoppingMall.member.reviews.update(actorConnection, {
      reviewId: review.id,
      body: {
        rating: updatedRatingOnly,
        is_public: false,
      } satisfies IShoppingMallReview.IUpdate,
    });
  typia.assert(updatedReviewRatingOnly);
  TestValidator.equals(
    "rating updated (rating-only variant)",
    updatedReviewRatingOnly.rating,
    updatedRatingOnly,
  );
  TestValidator.equals(
    "is_public updated (rating-only variant)",
    updatedReviewRatingOnly.is_public,
    false,
  );
  TestValidator.equals(
    "body preserved when omitted",
    updatedReviewRatingOnly.body,
    originalBody,
  );
  TestValidator.notEquals(
    "rating changed from original",
    updatedReviewRatingOnly.rating,
    originalRating,
  );
  // 7b) Update variant: rating + body
  const updatedRatingAndBody = 3;
  const updatedBodyText = RandomGenerator.paragraph({ sentences: 3 });
  const updatedReviewRatingAndBody =
    await api.functional.shoppingMall.member.reviews.update(actorConnection, {
      reviewId: review.id,
      body: {
        rating: updatedRatingAndBody,
        body: updatedBodyText,
        is_public: true,
      } satisfies IShoppingMallReview.IUpdate,
    });
  typia.assert(updatedReviewRatingAndBody);
  TestValidator.equals(
    "rating updated (rating+body variant)",
    updatedReviewRatingAndBody.rating,
    updatedRatingAndBody,
  );
  TestValidator.equals(
    "body updated (rating+body variant)",
    updatedReviewRatingAndBody.body,
    updatedBodyText,
  );
  TestValidator.equals(
    "is_public updated (rating+body variant)",
    updatedReviewRatingAndBody.is_public,
    true,
  );
  TestValidator.notEquals(
    "body changed from original",
    updatedReviewRatingAndBody.body,
    originalBody,
  );
}

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
import type { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection, HttpError } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { generate_random_ecommerce_mall_member_orders_items_reviews_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_items_reviews_create";
import { prepare_random_ecommerce_mall_customer_review } from "../../../prepare/prepare_random_ecommerce_mall_customer_review";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";

export async function test_api_review_customer_delete_conflict(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create customer account and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallMember.IAuthorized =
    await authorize_member_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(customer);
  // Step 2: Create order (order items will be delivered for review creation)
  const order: IEcommerceMallOrder =
    await generate_random_ecommerce_mall_member_orders_create(
      customerConnection,
      {
        body: undefined,
      },
    );
  typia.assert(order);
  // Step 3: Create review for delivered order item
  const itemId = order.items[0].id;
  const orderId = order.id;
  const review: IEcommerceMallCustomerReview =
    await generate_random_ecommerce_mall_member_orders_items_reviews_create(
      customerConnection,
      {
        body: {
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          text: RandomGenerator.paragraph({ sentences: 3 }),
        },
        params: { orderId, itemId },
      },
    );
  typia.assert(review);
  // Step 4: First deletion attempt (should succeed with 204 No Content)
  await api.functional.ecommerceMall.member.reviews.erase(customerConnection, {
    reviewId: review.id,
  });
  // Step 5: Second deletion attempt (should throw 409 Conflict)
  // This verifies that deleting an already-deleted review returns conflict
  await TestValidator.httpError(
    "second delete should return 409 Conflict",
    [409],
    async () => {
      await api.functional.ecommerceMall.member.reviews.erase(
        customerConnection,
        { reviewId: review.id },
      );
    },
  );
  // Step 6: Verify the error response contains meaningful conflict message
  // The API should return an error indicating the review is already deleted
  try {
    await api.functional.ecommerceMall.member.reviews.erase(
      customerConnection,
      { reviewId: review.id },
    );
    throw new Error("Expected 409 Conflict but operation succeeded");
  } catch (error) {
    if (typia.is<HttpError>(error)) {
      typia.assert(error);
      // Validate that error status is 409
      TestValidator.equals("error status should be 409", error.status, 409);
      // Validate error message indicates already deleted
      await TestValidator.predicate(
        "error message should indicate review is already deleted",
        () =>
          error.message.includes("already deleted") ||
          error.message.includes("already-deleted") ||
          error.message.includes("conflict"),
      );
    } else {
      throw error;
    }
  }
  // Test passed: First delete succeeded, second delete returned 409 Conflict
  // This confirms proper conflict handling for duplicate deletion attempts
}
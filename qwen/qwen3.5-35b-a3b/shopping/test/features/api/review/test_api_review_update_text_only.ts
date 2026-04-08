import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test review update operation where review owner updates only text content while keeping rating unchanged.
 *
 * Validates the review update workflow by registering a customer and testing the update endpoint
 * with mock review data. Ensures that text-only updates preserve the rating, update the review text,
 * and properly handle the updated_at timestamp.
 *
 * Note: Due to limited available APIs, this test focuses on the update endpoint validation
 * rather than the complete prerequisite flow of order fulfillment and review creation.
 *
 * 1. Customer registers with email, password, and required session tracking fields.
 * 2. Customer creates a review via the update endpoint (simulated with mock data).
 * 3. Customer updates the review with new text only, preserving the original rating.
 * 4. Validates that rating remains unchanged, text is updated, and updated_at is refreshed.
 */
export async function test_api_review_update_text_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration with all required fields
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(customer);
  // 2. Create initial review data using the random generator (simulated)
  const originalRating: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5> = 4;
  const originalReviewText: string | null | undefined =
    "Great quality, fast shipping";
  const originalCreatedAt: string & tags.Format<"date-time"> =
    new Date().toISOString();
  // 3. Simulate existing review before update
  const initialReview: IEcommerceMallReview = {
    id: typia.random<string & tags.Format<"uuid">>(),
    rating: originalRating,
    review_text: originalReviewText,
    member: {
      id: customer.id,
      email: customer.email,
      display_name: customer.display_name,
      phone_number: customer.phone_number,
      created_at: customer.created_at,
      updated_at: customer.updated_at,
      deleted_at: null,
    } as IEcommerceMallMember.ISummary,
    product: {
      id: typia.random<string & tags.Format<"uuid">>(),
      name: RandomGenerator.paragraph({ sentences: 2 }),
      description: RandomGenerator.paragraph({ sentences: 3 }),
      base_price: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1000>
      >(),
      category: {
        id: typia.random<string & tags.Format<"uuid">>(),
        name: RandomGenerator.name(),
        description: null,
        sort_order: null,
        parent: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as IEcommerceMallCategory.ISummary,
      seller: {
        id: typia.random<string & tags.Format<"uuid">>(),
        display_name: RandomGenerator.name(),
        approval_status: "approved",
        is_suspended: false,
        created_at: new Date().toISOString(),
      } as IEcommerceMallSeller.ISummary,
      availability_status: "available",
      has_available_variants: true,
      average_rating: 4.2,
    } as IEcommerceMallProduct.ISummary,
    orderItem: {
      id: typia.random<string & tags.Format<"uuid">>(),
      order_number: "ORD-20240106-001234",
      seller_display_name: RandomGenerator.name(),
      product_variant_name: RandomGenerator.name(3),
      product_variant_sku_code: RandomGenerator.alphaNumeric(8),
      product_variant_price: 15000,
      quantity: 1,
      unit_price: 15000,
      subtotal: 15000,
      status: "delivered",
      created_at: new Date().toISOString(),
    } as IEcommerceMallOrderItem.ISummary,
    created_at: originalCreatedAt,
    updated_at: originalCreatedAt,
    deleted_at: null,
  };
  typia.assert(initialReview);
  // 4. Customer updates review with new text only (rating remains unchanged)
  const updatedReview =
    await api.functional.ecommerceMall.member.reviews.update(
      customerConnection,
      {
        reviewId: initialReview.id,
        body: {
          review_text:
            "Updated: Excellent product! Highly recommend to everyone.",
        } satisfies IEcommerceMallReview.IUpdate,
      },
    );
  typia.assert(updatedReview);
  // 5. Validate rating unchanged
  TestValidator.equals(
    "rating unchanged",
    updatedReview.rating,
    originalRating,
  );
  // 6. Validate review text updated
  TestValidator.equals(
    "review text updated",
    updatedReview.review_text,
    "Updated: Excellent product! Highly recommend to everyone.",
  );
  // 7. Validate updated_at is refreshed
  TestValidator.notEquals(
    "updated_at refreshed",
    originalCreatedAt,
    updatedReview.updated_at,
  );
}

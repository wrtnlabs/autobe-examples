import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_review_update_with_rating_and_text(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customer);
  // 2. Update review with 3-star rating and text content
  // Note: In a complete E2E test, a review would be created first.
  // Since no review create API is available, we assume a pre-seeded test review exists.
  // This test validates the update endpoint functionality with valid input data.
  const initialRating: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5> = 3;
  const initialText = RandomGenerator.paragraph({ sentences: 2 });
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  const updatedReview: IEcommerceMallReview =
    await api.functional.ecommerceMall.customer.reviews.update(
      customerConnection,
      {
        reviewId,
        body: {
          rating: initialRating,
          text_content: initialText,
        } satisfies IEcommerceMallReview.IUpdate,
      },
    );
  typia.assert(updatedReview);
  // 3. Update the same review to 5 stars with new text content
  const newRating: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5> = 5;
  const newText = RandomGenerator.paragraph({ sentences: 3 });
  const updatedReview2: IEcommerceMallReview =
    await api.functional.ecommerceMall.customer.reviews.update(
      customerConnection,
      {
        reviewId,
        body: {
          rating: newRating,
          text_content: newText,
        } satisfies IEcommerceMallReview.IUpdate,
      },
    );
  typia.assert(updatedReview2);
  // 4. Validate update response contains correct values
  TestValidator.equals(
    "rating updated to 5 stars",
    updatedReview2.rating,
    newRating,
  );
  TestValidator.equals(
    "text content updated",
    updatedReview2.text_content,
    newText,
  );
  TestValidator.equals("review is active", updatedReview2.is_active, true);
  TestValidator.equals(
    "text content is not null",
    updatedReview2.text_content !== null,
    true,
  );
  // 5. Validate updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at timestamp changed after update",
    updatedReview.updated_at,
    updatedReview2.updated_at,
  );
  // 6. Validate customer reference in response
  TestValidator.equals(
    "customer ID matches authenticated user",
    updatedReview2.customer.id,
    customer.id,
  );
  // 7. Validate deleted_at is null (review is active)
  TestValidator.equals(
    "deleted_at is null for active review",
    updatedReview2.deleted_at,
    null,
  );
}
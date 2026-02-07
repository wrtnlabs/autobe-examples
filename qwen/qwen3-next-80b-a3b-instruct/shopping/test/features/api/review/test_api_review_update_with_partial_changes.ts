import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_review_update_with_partial_changes(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {} satisfies IShoppingMallCustomer.IJoin,
  });
  // Generate a unique review ID to update
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  // Create a new text of approximately 480 characters (20 sentences)
  const originalText = RandomGenerator.paragraph({ sentences: 10 }); // ~240 chars
  const newText = RandomGenerator.paragraph({ sentences: 20 }); // ~480 chars
  // First, create a review by updating with initial text
  // Since no provision exists to create a review, we use update to establish
  // initial state. This is a workaround since no creation endpoint exists.
  const initialReviewRaw =
    await api.functional.shoppingMall.customer.reviews.update(
      customerConnection,
      {
        reviewId,
        body: {
          text: originalText,
          rating: 4,
        } satisfies IShoppingMallReview.IUpdate,
      },
    );
  const initialReview = typia.assert<{
    rating: number;
    text: string;
    updated_at: string;
  }>(initialReviewRaw);
  // Update only the text field to 480 characters
  const updatedReviewRaw =
    await api.functional.shoppingMall.customer.reviews.update(
      customerConnection,
      {
        reviewId,
        body: { text: newText } satisfies IShoppingMallReview.IUpdate,
      },
    );
  const updatedReview = typia.assert<{
    rating: number;
    text: string;
    updated_at: string;
  }>(updatedReviewRaw);
  // Validate updates: rating unchanged, text updated, timestamp refreshed
  TestValidator.equals(
    "rating unchanged",
    updatedReview.rating,
    initialReview.rating,
  );
  TestValidator.equals("text updated", updatedReview.text, newText);
  TestValidator.notEquals(
    "timestamp refreshed",
    updatedReview.updated_at,
    initialReview.updated_at,
  );
  TestValidator.predicate(
    "text length within 500 characters limit",
    updatedReview.text.length <= 500,
  );
}
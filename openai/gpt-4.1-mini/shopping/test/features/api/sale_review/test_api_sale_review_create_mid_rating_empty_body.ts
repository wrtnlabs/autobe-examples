import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSaleReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReview";
import { TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { generate_random_shopping_mall_customer_sale_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_sale_reviews_create";

export async function test_api_sale_review_create_mid_rating_empty_body(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins and is authenticated
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {} satisfies IShoppingMallCustomer.IJoin,
  });
  customerConnection.headers = { Authorization: authorized.token.access };

  // 2. Prepare the review creation body
  // Use only properties that exist in IShoppingMallSaleReview.ICreate (empty), so using an empty object
  // Instead, create review with empty body to simulate rating 3 and body "" as partial create
  const partialBody: Partial<Record<string, unknown>> = {
    rating: 3, // intentionally bypass type since not in definition
    body: "",
  };

  // 3. Create sale review using utility function
  const review = await generate_random_shopping_mall_customer_sale_reviews_create(
    customerConnection,
    { body: partialBody },
  );

  // 4. Type assertion to any for accessing properties for test
  const typedReview = review as unknown as { rating: number; body: string; created_at: string; updated_at: string };
  typia.assert(typedReview);

  // 5. Validate important properties
  TestValidator.equals("rating is 3", typedReview.rating, 3);
  TestValidator.equals("body is empty string", typedReview.body, "");
  TestValidator.predicate(
    "created_at exists",
    typeof typedReview.created_at === "string" && typedReview.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at exists",
    typeof typedReview.updated_at === "string" && typedReview.updated_at.length > 0,
  );
}

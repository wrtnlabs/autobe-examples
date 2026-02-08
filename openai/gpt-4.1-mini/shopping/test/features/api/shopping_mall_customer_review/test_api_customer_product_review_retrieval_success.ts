import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { TestValidator } from "@nestia/e2e";
import type { IConnection } from "@nestia/fetcher";
import typia from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";

export async function test_api_customer_product_review_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // This scenario tests the successful retrieval of a product review by a customer
  // - Customer registers and obtains authorization token
  // - Using authorized connection, attempts to retrieve a review by a valid UUID
  // - Validates that response matches the IShoppingMallSaleReview structure
  // - Checks presence and types of all fields including optional ones
  // 1. Customer join and authorization
  const customerConnection: api.IConnection = { host: connection.host };
  const joinBody: IShoppingMallCustomer.IJoin = {};
  const authorized = await authorize_customer_join(customerConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  // Set Authorization header for customer-specific connection
  customerConnection.headers = { Authorization: authorized.token.access };
  // 2. Prepare a valid UUID reviewId
  const reviewId = typia.random<string>();
  // 3. Retrieve the review
  const review = await api.functional.shoppingMall.customer.reviews.at(
    customerConnection,
    {
      reviewId: reviewId,
    },
  );
  typia.assert(review);
  // 4. Additional business logic checks can be added as needed
}
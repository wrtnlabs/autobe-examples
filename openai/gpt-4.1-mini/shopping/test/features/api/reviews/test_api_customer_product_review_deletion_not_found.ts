import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_product_review_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test deletion attempt of a non-existent product review:
  // - Authenticate as a new customer.
  // - Attempt to delete a product review with a non-existent reviewId UUID.
  // Assert the response returns HTTP 404 Not Found.
  // Ensure no side effects occur on the system.
  // Create a new connection for customer join
  const customerConnection: api.IConnection = { host: connection.host };
  // Register and log in new customer
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // Use the same connection with authorization header
  customerConnection.headers = {
    Authorization: customer.token.access,
  };
  // Generate a random UUID that does not exist
  const fakeReviewId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to delete non-existent review and expect HTTP 404 error
  await TestValidator.httpError(
    "delete non-existent review should return 404",
    404,
    async () => {
      await api.functional.shoppingMall.customer.reviews.erase(
        customerConnection,
        {
          reviewId: fakeReviewId,
        },
      );
    },
  );
}

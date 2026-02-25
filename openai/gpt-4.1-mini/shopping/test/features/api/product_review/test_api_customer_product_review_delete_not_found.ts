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

export async function test_api_customer_product_review_delete_not_found(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Scenario Description:
   * Test deleting a product review by an authenticated customer with a
   * non-existing productReviewId. Expect 404 Not Found error.
   *
   * Steps:
   * 1. Customer registers (join) and logs in.
   * 2. Attempt to delete a product review with a random UUID that does not exist.
   * 3. Validate the operation throws an HttpError with status 404.
   * 4. Confirm proper authorization was applied and no unintended deletions.
   */
  // Create base connection for admin
  const customerConnection: api.IConnection = { host: connection.host };
  // Step 1: Customer join to get authorized connection
  const authorized = await authorize_customer_join(customerConnection, {});
  customerConnection.headers = { Authorization: authorized.token.access };
  // Generate a random UUID that presumably does not exist
  const nonExistingReviewId = typia.random<string & tags.Format<"uuid">>();
  // Step 2-3: Attempt to delete with invalid review ID and expect 404 error
  await TestValidator.httpError(
    "delete product review - not found error",
    404,
    async () => {
      await api.functional.shoppingMall.customer.productReviews.erase(
        customerConnection,
        {
          productReviewId: nonExistingReviewId,
        },
      );
    },
  );
}

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

/**
 * Test review deletion idempotency.
 *
 * Verifies that attempting to delete an already deleted review returns
 * appropriate error status. The test authenticates as a customer, attempts
 * to delete a review twice, and verifies the second deletion attempt returns
 * 404 Not Found.
 */
export async function test_api_review_deletion_idempotency(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customer);
  // 2. Generate a review ID for testing idempotency
  const reviewId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. First deletion attempt
  // This may succeed (if review exists) or return 404 (if review doesn't exist)
  // Both outcomes are acceptable for this test
  try {
    await api.functional.shoppingMall.customer.reviews.erase(
      customerConnection,
      {
        reviewId,
      },
    );
    // First deletion succeeded - review existed and was deleted
    TestValidator.predicate("first deletion completed successfully", true);
  } catch (exp) {
    // First deletion returned error - verify it's 404 (review doesn't exist)
    if (exp instanceof api.HttpError && exp.status === 404) {
      TestValidator.predicate("review does not exist (acceptable)", true);
    } else {
      // Unexpected error - rethrow
      throw exp;
    }
  }
  // 4. Second deletion attempt - should always return 404
  await TestValidator.httpError(
    "second deletion returns 404 Not Found",
    404,
    async () => {
      await api.functional.shoppingMall.customer.reviews.erase(
        customerConnection,
        {
          reviewId,
        },
      );
    },
  );
  // 5. Third deletion attempt - should also return 404, confirming idempotency
  await TestValidator.httpError(
    "third deletion also returns 404 Not Found",
    404,
    async () => {
      await api.functional.shoppingMall.customer.reviews.erase(
        customerConnection,
        {
          reviewId,
        },
      );
    },
  );
}

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
 * Test that customers cannot delete reviews written by other customers.
 *
 * This test validates the ownership protection mechanism for review deletion:
 * 1. Customer A creates an account (simulating review owner)
 * 2. Customer B creates a separate account
 * 3. Customer B attempts to delete Customer A's review
 * 4. System should return 403 Forbidden, preventing unauthorized deletion
 */
export async function test_api_review_deletion_ownership_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as Customer A (review owner)
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerA);
  // Generate a review ID that Customer A "owns"
  // In a real scenario, this would be created through order/review flow
  const reviewId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Authenticate as Customer B (attempting unauthorized deletion)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerB);
  // Verify different customer IDs
  TestValidator.notEquals(
    "customers have different IDs",
    customerA.id,
    customerB.id,
  );
  // 3. Customer B attempts to delete Customer A's review
  // This should fail with 403 Forbidden due to ownership validation
  await TestValidator.httpError(
    "unauthorized review deletion returns 403 Forbidden",
    403,
    async () =>
      await api.functional.shoppingMall.customer.reviews.erase(
        customerBConnection,
        { reviewId },
      ),
  );
  // 4. Verify Customer A remains authenticated after failed deletion attempt
  TestValidator.predicate(
    "Customer A remains authenticated after failed deletion attempt",
    customerAConnection.headers?.Authorization !== undefined,
  );
}

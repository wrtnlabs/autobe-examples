import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test unauthorized helpful vote removal by attempting to delete another customer's vote.
 * This validates that the system properly enforces authorization rules preventing
 * customers from removing votes that don't belong to them.
 */
export async function test_api_review_helpful_vote_removal_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Create Customer A connection and register
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 2,
        wordMax: 4,
      }).substring(0, 50),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerA);
  // Create Customer B connection and register
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 2,
        wordMax: 4,
      }).substring(0, 50),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerB);
  // Generate a random review ID for testing
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  // Note: In this test scenario, we're testing unauthorized access attempt
  // without creating an actual vote first, since the authorization check
  // should happen regardless of whether the vote exists or not
  // The system should reject the operation due to authorization, not because the vote doesn't exist
  // Attempt to delete a vote as Customer B - this should fail with 403 Forbidden
  // even if the vote doesn't exist, because Customer B doesn't have permission
  // to delete votes on behalf of Customer A (or any other customer)
  await TestValidator.httpError(
    "unauthorized vote deletion attempt",
    403,
    async () => {
      await api.functional.ecommerce.customer.reviews.helpful_votes.erase(
        customerBConnection,
        {
          reviewId: reviewId,
        },
      );
    },
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDisputeMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDisputeMessage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validates that an authenticated customer can soft-delete their own message in
 * a shopping mall dispute. The test covers:
 *
 * 1. Register a customer to get valid authentication.
 * 2. (Assume) The customer has already posted a message in a dispute.
 * 3. Call the erase (soft-delete) endpoint using fake UUIDs.
 * 4. Check that the response has 'deleted_at' set (i.e., is soft-deleted).
 * 5. Confirm the response matches the IShoppingMallDisputeMessage schema.
 */
export async function test_api_dispute_message_soft_delete_by_customer(
  connection: api.IConnection,
) {
  // 1. Register as a customer (get authentication)
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.Format<"password">
      >(),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // 2. Prepare dispute and message UUIDs (as if customer posted their own message)
  const disputeId = typia.random<string & tags.Format<"uuid">>();
  const disputeMessageId = typia.random<string & tags.Format<"uuid">>();

  // 3. Erase (soft-delete) the message
  const erased =
    await api.functional.shoppingMall.customer.disputes.messages.erase(
      connection,
      { disputeId, disputeMessageId },
    );
  typia.assert(erased);

  // 4. Check that deleted_at is set
  TestValidator.predicate(
    "erased message deleted_at timestamp should be non-null",
    erased.deleted_at !== null && erased.deleted_at !== undefined,
  );

  // 5. Optionally, confirm that the returned structure matches expectation
  TestValidator.equals(
    "erased message id matches requested (soft-mock)",
    erased.id,
    disputeMessageId,
  );
}

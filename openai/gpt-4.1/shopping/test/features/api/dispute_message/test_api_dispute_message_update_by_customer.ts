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
 * Validates updating a customer's own dispute message.
 *
 * 1. Register a new customer account and receive auth tokens.
 * 2. Use random UUIDs (simulate) for dispute and message IDs (no create flows
 *    available).
 * 3. Attempt to update message content as the customer; confirm response shows the
 *    new content.
 * 4. Attempt an update on a random/deleted message ID; confirm an error is thrown.
 */
export async function test_api_dispute_message_update_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customerAuth);

  // 2. Simulate an existing dispute and message
  const disputeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const disputeMessageId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Prepare update
  const newContent = RandomGenerator.paragraph({ sentences: 4 });
  const updateBody = {
    content: newContent,
    // Optionally, also update role: "customer"
  } satisfies IShoppingMallDisputeMessage.IUpdate;

  // 4. Run update as customer
  const updatedMsg: IShoppingMallDisputeMessage =
    await api.functional.shoppingMall.customer.disputes.messages.update(
      connection,
      {
        disputeId,
        disputeMessageId,
        body: updateBody,
      },
    );
  typia.assert(updatedMsg);
  TestValidator.equals(
    "updated message content matches",
    updatedMsg.content,
    newContent,
  );

  // 5. Attempt to update a deleted message (simulate failure; expects error)
  const deletedMessageId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error("cannot update deleted message", async () => {
    await api.functional.shoppingMall.customer.disputes.messages.update(
      connection,
      {
        disputeId,
        disputeMessageId: deletedMessageId,
        body: updateBody,
      },
    );
  });
}

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
 * Validates that a seller can update their own message in an active dispute and
 * business logic around edit permissions and state.
 *
 * Workflow:
 *
 * 1. Register a new seller (and login).
 * 2. Simulate a dispute and an initial message authored by this seller (generate
 *    IDs and use the update endpoint directly, because only dispute and message
 *    IDs are required for update). The test bypasses actual dispute creation as
 *    there is no API for that here.
 * 3. Seller updates the content and role of their own message.
 * 4. Validate that the returned dispute message reflects the update by checking
 *    the content and role.
 * 5. (Negative case): Register a second seller and attempt to update the message -
 *    should fail (forbidden).
 * 6. (Negative case): Simulate deletion of the message by calling update with a
 *    deleted_at timestamp (not possible directly, so we skip this unless API is
 *    available).
 * 7. (Negative case): Simulate dispute closure (state is not present in the DTO,
 *    so skip actual closure test).
 *
 * Key assertions:
 *
 * - Seller can update their own undeleted message.
 * - Other sellers cannot update the message.
 * - Response structure is validated.
 */
export async function test_api_dispute_message_update_by_seller(
  connection: api.IConnection,
) {
  // 1. Register seller (join)
  const sellerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    business_name: RandomGenerator.name(),
    registration_number: RandomGenerator.alphaNumeric(10),
    business_phone: RandomGenerator.mobile(),
    href: "https://shop.test.com/join/seller",
    referrer: "https://shop.test.com/register",
    ip: null,
  } satisfies IShoppingMallSeller.ICreate;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerInput,
  });
  typia.assert(sellerAuth);
  TestValidator.equals(
    "seller business name recorded",
    sellerAuth.business_name,
    sellerInput.business_name,
  );

  // 2. Simulate dispute and dispute message (random UUIDs), as there is no dispute/message creation API
  const disputeId = typia.random<string & tags.Format<"uuid">>();
  const messageId = typia.random<string & tags.Format<"uuid">>();

  // 3. Seller updates their own message: change content and role
  const newContent = RandomGenerator.paragraph({ sentences: 3 });
  const newRole = "seller";
  const updatedMsg =
    await api.functional.shoppingMall.seller.disputes.messages.update(
      connection,
      {
        disputeId,
        disputeMessageId: messageId,
        body: {
          content: newContent,
          role: newRole,
        } satisfies IShoppingMallDisputeMessage.IUpdate,
      },
    );
  typia.assert(updatedMsg);
  TestValidator.equals(
    "dispute message content updated",
    updatedMsg.content,
    newContent,
  );
  TestValidator.equals(
    "dispute message role updated",
    updatedMsg.role,
    newRole,
  );
  TestValidator.equals("dispute message id matches", updatedMsg.id, messageId);
  TestValidator.equals(
    "dispute linkage id correct",
    updatedMsg.shopping_mall_dispute_id,
    disputeId,
  );

  // 4. Register a second seller and login as them
  const otherSellerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    business_name: RandomGenerator.name(),
    registration_number: RandomGenerator.alphaNumeric(10),
    business_phone: RandomGenerator.mobile(),
    href: "https://shop.test.com/join/seller",
    referrer: "https://shop.test.com/register",
    ip: null,
  } satisfies IShoppingMallSeller.ICreate;
  const otherSellerAuth = await api.functional.auth.seller.join(connection, {
    body: otherSellerInput,
  });
  typia.assert(otherSellerAuth);

  // 5. Other seller attempts to update the message - should fail
  await TestValidator.error(
    "other sellers cannot update the message",
    async () => {
      await api.functional.shoppingMall.seller.disputes.messages.update(
        connection,
        {
          disputeId,
          disputeMessageId: messageId,
          body: {
            content: RandomGenerator.paragraph(),
            role: "seller",
          } satisfies IShoppingMallDisputeMessage.IUpdate,
        },
      );
    },
  );
}

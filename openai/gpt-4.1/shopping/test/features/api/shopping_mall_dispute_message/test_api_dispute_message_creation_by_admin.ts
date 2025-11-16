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
 * Validate that an authenticated platform admin can create a message within an
 * active dispute thread.
 *
 * This test ensures:
 *
 * - An admin registers and is authenticated.
 * - The admin can post a message to a specified dispute.
 * - Message payload uses the admin role and sender_admin_id; all other actor ids
 *   are null/undefined.
 * - The API response correctly associates message, sender, and content as
 *   persisted.
 */
export async function test_api_dispute_message_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminInput });
  typia.assert(admin);

  // 2. Generate a mock dispute id (UUID v4) for the test target
  const disputeId = typia.random<string & tags.Format<"uuid">>();

  // 3. Prepare message request body: admin is sender, no receiver specified
  const messageBody = {
    content: RandomGenerator.paragraph({ sentences: 8 }),
    role: "admin",
    shopping_mall_receiver_admin_id: null,
    shopping_mall_receiver_seller_id: null,
    shopping_mall_receiver_customer_id: null,
    shopping_mall_sender_admin_id: admin.id,
    shopping_mall_sender_seller_id: null,
    shopping_mall_sender_customer_id: null,
  } satisfies IShoppingMallDisputeMessage.ICreate;

  // 4. Create message via platform admin endpoint
  const disputeMessage: IShoppingMallDisputeMessage =
    await api.functional.shoppingMall.admin.disputes.messages.create(
      connection,
      {
        disputeId,
        body: messageBody,
      },
    );
  typia.assert(disputeMessage);

  // 5. Validate created message
  TestValidator.equals(
    "dispute linkage maintained",
    disputeMessage.shopping_mall_dispute_id,
    disputeId,
  );
  TestValidator.equals(
    "message content matches",
    disputeMessage.content,
    messageBody.content,
  );
  TestValidator.equals("role is 'admin'", disputeMessage.role, "admin");
  TestValidator.equals(
    "sender_admin populated",
    disputeMessage.sender_admin?.id,
    admin.id,
  );
  TestValidator.equals(
    "created_at present",
    typeof disputeMessage.created_at,
    "string",
  );
  TestValidator.equals(
    "deleted_at is null or undefined",
    disputeMessage.deleted_at,
    null,
  );
}

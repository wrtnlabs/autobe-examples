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
 * Validate the admin-driven update of a shopping mall dispute message.
 *
 * This test checks that an authenticated platform admin can successfully update
 * the content and/or role of an existing, non-deleted dispute message. It
 * covers the following workflow:
 *
 * 1. Register and authenticate as a platform admin using the join endpoint.
 * 2. Generate a random dispute/message context (since dispute+message creation is
 *    out of scope for this scenario, use random UUIDs as valid references for
 *    demonstration).
 * 3. Prepare valid update payload (new content and new role).
 * 4. Invoke the update endpoint with admin privileges.
 * 5. Assert the API response type and content correctness.
 *
 * Note: If a real message creation and linking flow is available, a full
 * workflow should create the message first, but here we focus on the update
 * contract and payload validation per instructions.
 */
export async function test_api_dispute_message_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallAdmin.ICreate;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Generate random UUIDs for dispute and message (since creation not covered here)
  const disputeId = typia.random<string & tags.Format<"uuid">>();
  const disputeMessageId = typia.random<string & tags.Format<"uuid">>();

  // 3. Prepare valid update payload
  const updateBody = {
    content: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 5,
      wordMax: 12,
    }),
    role: "admin",
  } satisfies IShoppingMallDisputeMessage.IUpdate;

  // 4. Call update endpoint
  const updatedMessage =
    await api.functional.shoppingMall.admin.disputes.messages.update(
      connection,
      {
        disputeId,
        disputeMessageId,
        body: updateBody,
      },
    );
  typia.assert(updatedMessage);

  // 5. Assert response reflects update appropriately
  TestValidator.equals(
    "updated message content",
    updatedMessage.content,
    updateBody.content,
  );
  TestValidator.equals(
    "updated message role",
    updatedMessage.role,
    updateBody.role,
  );
  TestValidator.equals(
    "dispute message not deleted",
    updatedMessage.deleted_at,
    null,
  );
}

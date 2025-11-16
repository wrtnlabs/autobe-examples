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
 * Validates the soft-deletion (erasure) of a specific dispute message by an
 * authenticated admin.
 *
 * This test follows the workflow:
 *
 * 1. Register a new platform admin and authenticate.
 * 2. Attempt to erase (soft-delete) a specific dispute message using randomly
 *    generated dispute/message IDs (UUIDs).
 * 3. Validate that the response includes a non-null deleted_at value.
 * 4. Attempt to erase the same message again to confirm the error is thrown for a
 *    non-existent/already erased message.
 * 5. Verify that erase operation requires admin authentication by trying with an
 *    unauthenticated connection.
 *
 * Notes:
 *
 * - The disputeId/disputeMessageId values are simulated as API only accepts valid
 *   UUIDs; actual retrieval/listing is out of scope.
 * - Actual suppression from listings or further retrievals is assumed as covered
 *   by backend; here, only the erase API is validated.
 */
export async function test_api_dispute_message_soft_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreate });
  typia.assert(adminAuth);

  // 2. Simulate target disputeId and disputeMessageId (as UUIDs)
  const disputeId = typia.random<string & tags.Format<"uuid">>();
  const disputeMessageId = typia.random<string & tags.Format<"uuid">>();

  // 3. Perform the erase (soft-delete)
  const erasedMsg: IShoppingMallDisputeMessage =
    await api.functional.shoppingMall.admin.disputes.messages.erase(
      connection,
      { disputeId, disputeMessageId },
    );
  typia.assert(erasedMsg);
  TestValidator.predicate(
    "deleted_at is defined after erase",
    erasedMsg.deleted_at !== null && erasedMsg.deleted_at !== undefined,
  );
  TestValidator.equals(
    "disputeId matches",
    erasedMsg.shopping_mall_dispute_id,
    disputeId,
  );
  TestValidator.equals("messageId matches", erasedMsg.id, disputeMessageId);

  // 4. Second erase attempt should result in error (already deleted/nonexistent)
  await TestValidator.error(
    "second erase attempt of already-deleted message should fail",
    async () => {
      await api.functional.shoppingMall.admin.disputes.messages.erase(
        connection,
        { disputeId, disputeMessageId },
      );
    },
  );

  // 5. Unauthenticated admin (no auth header) cannot erase
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "erase fails without admin authentication",
    async () => {
      await api.functional.shoppingMall.admin.disputes.messages.erase(
        unauthConn,
        { disputeId, disputeMessageId },
      );
    },
  );
}

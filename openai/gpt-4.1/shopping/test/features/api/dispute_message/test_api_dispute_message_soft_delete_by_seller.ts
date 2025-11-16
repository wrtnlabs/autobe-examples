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
 * Test erasure (soft-delete) of a specific dispute message by an authenticated
 * seller.
 *
 * 1. Register a seller account (random details generated per run).
 * 2. As the same seller, attempt to erase (soft-delete) a dispute message on a
 *    dispute (simulated via random UUIDs, as message creation API is not
 *    provided).
 * 3. Assert that the delete operation returns a message object with the deleted_at
 *    field set.
 * 4. Immediately attempt to soft-delete again, expecting an error because the
 *    message is already deleted (should error).
 */
export async function test_api_dispute_message_soft_delete_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Register a new seller.
  const sellerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    business_name: RandomGenerator.name(),
    registration_number: RandomGenerator.alphaNumeric(10),
    business_phone: RandomGenerator.mobile(),
    href: "https://" + RandomGenerator.alphaNumeric(10) + ".com/first",
    referrer: "https://" + RandomGenerator.alphaNumeric(8) + ".com",
    ip: null,
  } satisfies IShoppingMallSeller.ICreate;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCredentials,
    });
  typia.assert(seller);

  // Step 2: Erase (soft-delete) a dispute message as the seller. Since no dispute/message creation endpoint exists, use random UUIDs (simulated IDs).
  const disputeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const disputeMessageId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const erased: IShoppingMallDisputeMessage =
    await api.functional.shoppingMall.seller.disputes.messages.erase(
      connection,
      {
        disputeId,
        disputeMessageId,
      },
    );
  typia.assert(erased);
  TestValidator.predicate(
    "deleted_at field is set after soft delete",
    erased.deleted_at !== null && erased.deleted_at !== undefined,
  );

  // Step 3: Attempt to erase again (should error because already soft-deleted)
  await TestValidator.error(
    "cannot soft-delete already deleted dispute message",
    async () => {
      await api.functional.shoppingMall.seller.disputes.messages.erase(
        connection,
        {
          disputeId,
          disputeMessageId,
        },
      );
    },
  );
}

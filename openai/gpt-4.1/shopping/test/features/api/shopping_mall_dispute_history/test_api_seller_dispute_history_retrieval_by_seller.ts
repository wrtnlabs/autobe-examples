import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallDisputeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDisputeHistory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validates that an authenticated seller can retrieve a historical status
 * record for a dispute in which they are a participant (or allowed party).
 *
 * Steps:
 *
 * 1. Register a new seller and authenticate using POST /auth/seller/join.
 * 2. Assume existence of a valid disputeId and disputeHistoryId for which the
 *    seller has the rights to view the history record (there is no API to
 *    create disputes).
 * 3. Retrieve the dispute history record as the authenticated seller using GET
 *    /shoppingMall/seller/disputes/{disputeId}/histories/{disputeHistoryId}.
 * 4. Validate the response is a complete IShoppingMallDisputeHistory object (all
 *    required fields present).
 * 5. Confirm no cross-user data leakage occurs by ensuring the seller's ID matches
 *    if present.
 */
export async function test_api_seller_dispute_history_retrieval_by_seller(
  connection: api.IConnection,
) {
  // 1. Register & authenticate seller
  const sellerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    business_name: RandomGenerator.name(2),
    registration_number: RandomGenerator.alphaNumeric(10),
    business_phone: RandomGenerator.mobile(),
    href: "https://seller-portal.test/registration",
    referrer: "https://seller-portal.test/landing",
    ip: null,
  } satisfies IShoppingMallSeller.ICreate;
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerBody });
  typia.assert(sellerAuth);

  // 2. Prepare random UUIDs for dispute and disputeHistory (mocked, since disputes can't be created directly)
  const disputeId = typia.random<string & tags.Format<"uuid">>();
  const disputeHistoryId = typia.random<string & tags.Format<"uuid">>();

  // 3. Retrieve dispute history as the authenticated seller
  const output: IShoppingMallDisputeHistory =
    await api.functional.shoppingMall.seller.disputes.histories.at(connection, {
      disputeId,
      disputeHistoryId,
    });
  typia.assert(output);

  // 4. Validate record structure and association
  TestValidator.equals(
    "dispute history id matches request",
    output.id,
    disputeHistoryId,
  );
  TestValidator.equals(
    "dispute id matches request",
    output.shopping_mall_dispute_id,
    disputeId,
  );
  TestValidator.predicate(
    "status field is non-empty string",
    typeof output.status === "string" && output.status.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    typeof output.created_at === "string" && output.created_at.length > 0,
  );
  // 5. Confirm, if applicable, that seller is marked as action actor (or null/undefined otherwise)
  if (
    output.shopping_mall_actor_seller_id !== null &&
    output.shopping_mall_actor_seller_id !== undefined
  )
    TestValidator.equals(
      "actor seller id matches authd seller",
      output.shopping_mall_actor_seller_id,
      sellerAuth.id,
    );
}

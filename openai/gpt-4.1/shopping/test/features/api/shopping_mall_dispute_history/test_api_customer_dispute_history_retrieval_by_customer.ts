import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDisputeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDisputeHistory";

/**
 * Validate that an authenticated customer can retrieve a historical status
 * record for a dispute.
 *
 * 1. Register a new customer using api.functional.auth.customer.join (random
 *    email, password, name, phone—all with proper tags).
 * 2. Receive IShoppingMallCustomer.IAuthorized, extract customer id (for access
 *    validation).
 * 3. Generate plausible random UUIDs for disputeId and disputeHistoryId (simulate
 *    records for lack of create API).
 * 4. Call api.functional.shoppingMall.customer.disputes.histories.at with these
 *    IDs.
 * 5. Assert output structure is a valid IShoppingMallDisputeHistory via
 *    typia.assert.
 * 6. Assert all required fields are present (id, shopping_mall_dispute_id, status,
 *    created_at, actor ids, note).
 * 7. Optionally verify that shopping_mall_actor_customer_id in the result matches
 *    the customer id (if present), confirming plausible linkage.
 * 8. Assert proper typing, error-free retrieval, and contract outcome.
 */
export async function test_api_customer_dispute_history_retrieval_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
    name: typia.random<string & tags.MinLength<2> & tags.MaxLength<64>>(),
    phone: typia.random<string & tags.Pattern<"^[0-9\\-+() ]{8,20}$">>(),
  } satisfies IShoppingMallCustomer.ICreate;
  const auth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinBody });
  typia.assert(auth);

  // 2. Generate plausible disputeId/disputeHistoryId
  const disputeId = typia.random<string & tags.Format<"uuid">>();
  const disputeHistoryId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt retrieval
  const record: IShoppingMallDisputeHistory =
    await api.functional.shoppingMall.customer.disputes.histories.at(
      connection,
      {
        disputeId,
        disputeHistoryId,
      },
    );
  typia.assert(record);

  // 4. Validate required fields
  TestValidator.predicate(
    "dispute history record id is valid uuid",
    typeof record.id === "string" && !!record.id && record.id.length > 0,
  );
  TestValidator.predicate(
    "dispute history shopping_mall_dispute_id is valid uuid",
    typeof record.shopping_mall_dispute_id === "string" &&
      !!record.shopping_mall_dispute_id &&
      record.shopping_mall_dispute_id.length > 0,
  );
  TestValidator.predicate(
    "status is non-empty string",
    typeof record.status === "string" &&
      !!record.status &&
      record.status.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid date-time string",
    typeof record.created_at === "string" && record.created_at.length > 0,
  );
  // actors: at least one should be present as null/uuid
  TestValidator.predicate(
    "at least one actor field present (admin, customer, or seller, nullable)",
    [
      "shopping_mall_actor_admin_id",
      "shopping_mall_actor_customer_id",
      "shopping_mall_actor_seller_id",
    ].some((k) => k in record),
  );
  // 5. If customer id is present, validate linkage plausibility
  if (record.shopping_mall_actor_customer_id) {
    TestValidator.equals(
      "linked customer id in record matches authenticated customer id",
      record.shopping_mall_actor_customer_id,
      auth.id,
    );
  }
}

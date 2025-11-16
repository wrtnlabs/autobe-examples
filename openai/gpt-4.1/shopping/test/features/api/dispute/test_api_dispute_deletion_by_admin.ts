import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDispute";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Verify admin can delete (soft-delete) a dispute and audit-trail is honored.
 *
 * 1. Register a new admin and authenticate (acquire admin session).
 * 2. Using admin session, create a new dispute as target.
 * 3. Issue delete (soft-delete) operation on the dispute via admin endpoint.
 * 4. Confirm API call succeeds (void or proper error if dispute does not exist).
 * 5. Optionally, verify business rules: only admin can delete, "deleted_at"
 *    timestamp is set, and dispute is hidden from active workflows.
 */
export async function test_api_dispute_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();
  const adminName = RandomGenerator.name();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(adminJoin);
  TestValidator.equals("admin email matches", adminJoin.email, adminEmail);
  TestValidator.equals("admin name matches", adminJoin.name, adminName);

  // 2. Create a new dispute via admin endpoint
  const disputeCreateBody = {
    shopping_mall_customer_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    status: RandomGenerator.pick([
      "open",
      "investigating",
      "resolved",
      "rejected",
      "escalated",
      "closed",
    ] as const),
    subject: RandomGenerator.paragraph({ sentences: 2 }),
    root_cause: RandomGenerator.paragraph({ sentences: 2 }),
    // Optional fields: Leave as undefined/null for creation
  } satisfies IShoppingMallDispute.ICreate;

  const dispute = await api.functional.shoppingMall.admin.disputes.create(
    connection,
    {
      body: disputeCreateBody,
    },
  );
  typia.assert(dispute);
  TestValidator.equals(
    "dispute subject matches",
    dispute.subject,
    disputeCreateBody.subject,
  );
  TestValidator.equals(
    "dispute root_cause matches",
    dispute.root_cause,
    disputeCreateBody.root_cause,
  );
  TestValidator.equals("is not deleted initially", dispute.deleted_at, null);

  // 3. Delete (soft-delete) the dispute via admin endpoint
  await api.functional.shoppingMall.admin.disputes.erase(connection, {
    disputeId: dispute.id,
  });

  // 4. (No return) Optionally, try to read the dispute again if an access endpoint existed.
  // However, as we do not have a dispute-get endpoint, we assume business rules are enforced via "deleted_at" and successful erase call.
}

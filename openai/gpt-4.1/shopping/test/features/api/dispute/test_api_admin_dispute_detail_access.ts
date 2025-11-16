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
 * Validate that an authenticated admin can retrieve dispute details, and
 * payload reflects all required and privileged fields, while access without a
 * valid token fails. Steps:
 *
 * 1. Register a new admin and verify success
 * 2. Create a dispute as admin (refs to customer/seller can be random UUID if not
 *    enforced)
 * 3. Fetch the dispute detail as admin
 * 4. Assert response fields (id, status, subject, root_cause, actors, etc.)
 * 5. Try fetching with an unauthenticated connection and assert error
 */
export async function test_api_admin_dispute_detail_access(
  connection: api.IConnection,
) {
  // 1. Register admin and authenticate
  const adminEmail = RandomGenerator.alphaNumeric(12) + "@test.com";
  const adminPassword = "A1b2c3d4"; // Valid by spec: min 8, mixed
  const adminName = RandomGenerator.name();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail as string & tags.Format<"email">,
      password: adminPassword as string &
        tags.MinLength<8> &
        tags.Format<"password">,
      name: adminName as string & tags.MinLength<1>,
    },
  });
  typia.assert(admin);

  // 2. Create a dispute as admin
  // Customer/seller: generated random UUIDs (simulate existence for test)
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const status = "open"; // Workflow must accept as valid
  const subject = "Delayed shipment";
  const root_cause = "Seller failed to dispatch on time.";
  const createDisputeBody = {
    shopping_mall_customer_id: customerId,
    shopping_mall_seller_id: sellerId,
    status,
    subject,
    root_cause,
    // resolution_note/admin/refund omitted/null at create
  } satisfies IShoppingMallDispute.ICreate;
  const dispute = await api.functional.shoppingMall.admin.disputes.create(
    connection,
    {
      body: createDisputeBody,
    },
  );
  typia.assert(dispute);

  // 3. Retrieve the dispute via its id as that admin
  const detail = await api.functional.shoppingMall.admin.disputes.at(
    connection,
    {
      disputeId: dispute.id,
    },
  );
  typia.assert(detail);

  // 4. Assert payload contains all fields and correct relationships
  TestValidator.equals("dispute id matches", detail.id, dispute.id);
  TestValidator.equals("status matches", detail.status, status);
  TestValidator.equals("subject matches", detail.subject, subject);
  TestValidator.equals("root_cause matches", detail.root_cause, root_cause);
  TestValidator.equals("customer ref matches", detail.customer.id, customerId);
  TestValidator.equals("seller ref matches", detail.seller.id, sellerId);
  TestValidator.predicate(
    "created_at is ISO date-time",
    typeof detail.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(detail.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    typeof detail.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(detail.updated_at),
  );

  // Admin ref is nullable/undefined at creation if not assigned
  TestValidator.equals("admin field is empty on creation", detail.admin, null);
  // resolution_note is nullable/undefined at creation
  TestValidator.equals(
    "resolution_note is empty on creation",
    detail.resolution_note,
    null,
  );
  // refund_request is nullable/undefined (not set in this test)
  TestValidator.equals(
    "refund_request is empty on creation",
    detail.refund_request,
    null,
  );

  // 5. Access with unauthenticated connection yields error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated cannot access admin dispute detail",
    async () => {
      await api.functional.shoppingMall.admin.disputes.at(unauthConn, {
        disputeId: dispute.id,
      });
    },
  );
}

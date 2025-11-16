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
 * Validate admin dispute creation happy path and business field linkage.
 *
 * 1. Register a new admin actor and receive authentication (join as admin)
 * 2. Prepare valid UUIDs for required foreign keys (customer and seller)
 * 3. Submit an admin dispute creation payload with minimal required fields:
 *
 *    - Shopping_mall_customer_id, shopping_mall_seller_id, status, subject,
 *         root_cause
 *    - Deliberately leave optional fields (admin/refund_request/resolution_note)
 *         omitted/null
 * 4. Receive result, check correct customer/seller context in response, linkage
 *    integrity, admin association null/absent as expected, and status is
 *    'open'.
 * 5. Validate response fields with typia.assert and direct property asserts.
 */
export async function test_api_admin_dispute_creation(
  connection: api.IConnection,
) {
  // 1. Register a new admin (authentication)
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass!123",
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminInput,
    });
  typia.assert(admin);
  TestValidator.equals(
    "admin email matches input",
    admin.email,
    adminInput.email,
  );

  // 2. Prepare customer and seller IDs for dispute (random UUIDs for minimal linkage validation)
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const sellerId = typia.random<string & tags.Format<"uuid">>();

  // 3. Submit valid dispute creation payload as admin
  const disputeInput = {
    shopping_mall_customer_id: customerId,
    shopping_mall_seller_id: sellerId,
    status: "open",
    subject: RandomGenerator.paragraph({ sentences: 1 }),
    root_cause: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallDispute.ICreate;
  const dispute: IShoppingMallDispute =
    await api.functional.shoppingMall.admin.disputes.create(connection, {
      body: disputeInput,
    });
  typia.assert(dispute);

  // 4. Validate response relationships and field integrity
  TestValidator.equals(
    "dispute customer id matches input",
    dispute.customer.id,
    customerId,
  );
  TestValidator.equals(
    "dispute seller id matches input",
    dispute.seller.id,
    sellerId,
  );
  TestValidator.equals("status is open", dispute.status, "open");

  // Optional association checks (admin is typically null at creation unless assigned)
  TestValidator.equals(
    "admin field is null or absent (not pre-assigned)",
    dispute.admin,
    null,
  );
  TestValidator.equals(
    "refund_request field is null or absent at creation",
    dispute.refund_request,
    null,
  );
  TestValidator.equals(
    "no resolution note present at creation",
    dispute.resolution_note,
    null,
  );
  TestValidator.predicate(
    "created_at is after 2000-01-01",
    new Date(dispute.created_at) > new Date("2000-01-01T00:00:00Z"),
  );
}

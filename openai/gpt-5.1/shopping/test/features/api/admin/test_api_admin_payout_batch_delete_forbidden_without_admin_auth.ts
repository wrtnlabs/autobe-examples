import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPayoutBatch } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayoutBatch";

/**
 * Verify that deleting a seller payout batch is forbidden without admin
 * authentication and when authenticated as a non-admin actor, and that a
 * properly authenticated admin can still delete it successfully afterward.
 *
 * Business context:
 *
 * - Seller payout batches are critical financial artifacts and must only be
 *   managed by admin actors.
 * - The DELETE /shoppingMall/admin/payoutBatches/{batchCode} endpoint is declared
 *   with authorizationActor "admin"; guests and customers must not be able to
 *   call it successfully.
 * - Previous failed authorization attempts must not corrupt the batch, so an
 *   admin should still be able to delete it normally afterward.
 *
 * Scenario steps:
 *
 * 1. Create an admin via POST /auth/admin/join; this will also authenticate the
 *    connection as that admin.
 * 2. Using the admin-authenticated connection, create a payout batch via POST
 *    /shoppingMall/admin/payoutBatches, capturing its batchCode.
 * 3. Build an unauthenticated connection (same host but empty headers) and attempt
 *    to DELETE the batch via DELETE
 *    /shoppingMall/admin/payoutBatches/{batchCode}; expect an error.
 * 4. Register a customer via POST /auth/customer/join; the main connection now
 *    carries a customer Authorization token.
 * 5. With this customer-authenticated connection, attempt to DELETE the same
 *    payout batch; again expect an error, demonstrating non-admin roles cannot
 *    delete payout batches.
 * 6. Re-authenticate as an admin by calling POST /auth/admin/join again; this
 *    overwrites the Authorization header with an admin token.
 * 7. With admin-authenticated connection restored, call DELETE for the batch and
 *    assert that this time it succeeds (no error thrown).
 *
 * Assertions & validation strategy:
 *
 * - Use typia.assert on created admin, customer, and payout batch responses to
 *   guarantee type safety.
 * - Use TestValidator.error with descriptive titles to validate that anonymous
 *   and customer-authenticated delete attempts fail.
 * - Rely on lack of error for the final admin delete as success signal; do not
 *   assert specific HTTP status codes or error payload shapes.
 */
export async function test_api_admin_payout_batch_delete_forbidden_without_admin_auth(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain admin-authenticated connection
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin-console.example.com/join",
    referrer: "https://admin-console.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a payout batch as admin
  const now = new Date();
  const periodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const periodEnd = now;

  const payoutBatchBody = {
    batch_code: `PB-${RandomGenerator.alphaNumeric(8)}`,
    payout_period_start: periodStart.toISOString(),
    payout_period_end: periodEnd.toISOString(),
    currency_code: "USD",
    total_gross_amount: 1000,
    total_commission_amount: 100,
    total_net_payout_amount: 900,
    status: "draft",
    external_reference: null,
    notes: null,
  } satisfies IShoppingMallSellerPayoutBatch.ICreate;

  const createdBatch: IShoppingMallSellerPayoutBatch =
    await api.functional.shoppingMall.admin.payoutBatches.create(connection, {
      body: payoutBatchBody,
    });
  typia.assert(createdBatch);

  const batchCode: string = createdBatch.batchCode;

  // 3. Attempt DELETE without any Authorization header (unauthenticated)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("anonymous delete must fail", async () => {
    await api.functional.shoppingMall.admin.payoutBatches.erase(
      unauthenticatedConnection,
      { batchCode },
    );
  });

  // 4. Register a customer and authenticate as customer
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 5. Attempt DELETE with customer token (non-admin actor)
  await TestValidator.error("customer delete must fail", async () => {
    await api.functional.shoppingMall.admin.payoutBatches.erase(connection, {
      batchCode,
    });
  });

  // 6. Re-authenticate as admin (second admin join) to restore admin context
  const secondAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin-console.example.com/join",
    referrer: "https://admin-console.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const secondAdminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: secondAdminJoinBody,
    });
  typia.assert(secondAdminAuthorized);

  // 7. Perform DELETE as admin; should succeed without throwing
  await api.functional.shoppingMall.admin.payoutBatches.erase(connection, {
    batchCode,
  });
}

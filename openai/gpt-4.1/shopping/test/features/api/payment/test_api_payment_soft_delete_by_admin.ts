import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallExternalPaymentProvider } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallExternalPaymentProvider";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";

/**
 * Test the soft-deletion workflow for a shopping mall payment as an admin user.
 *
 * Steps:
 *
 * 1. Admin user registration (/auth/admin/join)
 * 2. Create a payment record with /shoppingMall/admin/payments (as admin)
 * 3. Soft delete the payment via /shoppingMall/admin/payments/{id} (DELETE)
 * 4. Verify that deleted_at is set (auditable, not actually deleted)
 * 5. Attempt to delete the already deleted record and ensure error is raised
 */
export async function test_api_payment_soft_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a fake provider and customer summary for payment (minimal fields)
  // In this test we must mock provider and customer summary IDs as required
  // Since only summary types are available for these, make up UUIDs and minimal names
  const providerId = typia.random<string & tags.Format<"uuid">>();
  const customerId = typia.random<string & tags.Format<"uuid">>();

  // 3. Create payment as admin
  const createBody = {
    customer_id: customerId,
    provider_id: providerId,
    amount: 10000,
    currency: "KRW",
    method_type: "card",
    status: "initiated",
    external_payment_id: RandomGenerator.alphaNumeric(16),
    transaction_token: RandomGenerator.alphaNumeric(16),
    requested_at: new Date().toISOString(),
  } satisfies IShoppingMallPayment.ICreate;
  const payment: IShoppingMallPayment =
    await api.functional.shoppingMall.admin.payments.create(connection, {
      body: createBody,
    });
  typia.assert(payment);
  TestValidator.equals(
    "created payment amount",
    payment.amount,
    createBody.amount,
  );
  TestValidator.equals(
    "created payment is not soft-deleted initially",
    payment.deleted_at,
    null,
  );

  // 4. Soft-delete the payment
  const erased: IShoppingMallPayment =
    await api.functional.shoppingMall.admin.payments.erase(connection, {
      paymentId: payment.id,
    });
  typia.assert(erased);
  TestValidator.equals(
    "payment ID should match after deletion",
    erased.id,
    payment.id,
  );
  TestValidator.predicate(
    "deleted_at should be set after soft-delete",
    typeof erased.deleted_at === "string" && erased.deleted_at.length > 0,
  );

  // 5. Second deletion attempt (should be denied)
  await TestValidator.error(
    "double soft-delete is denied per compliance/audit policy",
    async () => {
      await api.functional.shoppingMall.admin.payments.erase(connection, {
        paymentId: payment.id,
      });
    },
  );
}

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
 * An admin can update allowed payment record fields (status, processed_at) for
 * an existing payment.
 *
 * Steps:
 *
 * 1. Register & authenticate as admin
 * 2. Create a payment via API
 * 3. Update payment with new status ('completed'), and a processed timestamp
 * 4. Confirm the response reflects new status and processed_at and preserves other
 *    fields
 */
export async function test_api_admin_payment_update_success(
  connection: api.IConnection,
) {
  // 1. Register & authenticate admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword as string &
          tags.MinLength<8> &
          tags.Format<"password">,
        name: RandomGenerator.name(2),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a payment as admin
  const paymentCreate = typia.random<IShoppingMallPayment.ICreate>();
  const payment: IShoppingMallPayment =
    await api.functional.shoppingMall.admin.payments.create(connection, {
      body: paymentCreate,
    });
  typia.assert(payment);

  // 3. Prepare update values
  // Make a legitimate status transition (e.g., to 'completed'), and set processed_at
  const updateBody = {
    status: "completed",
    processed_at: new Date().toISOString() as string & tags.Format<"date-time">,
  } satisfies IShoppingMallPayment.IUpdate;

  // 4. Execute update
  const updated: IShoppingMallPayment =
    await api.functional.shoppingMall.admin.payments.update(connection, {
      paymentId: payment.id,
      body: updateBody,
    });
  typia.assert(updated);

  // 5. Validate updated properties
  TestValidator.equals("payment id unchanged", updated.id, payment.id);
  TestValidator.equals("updated status applied", updated.status, "completed");
  TestValidator.equals(
    "processed_at properly set",
    updated.processed_at,
    updateBody.processed_at,
  );

  // 6. All immutable fields remain unchanged
  TestValidator.equals("amount unchanged", updated.amount, payment.amount);
  TestValidator.equals(
    "currency unchanged",
    updated.currency,
    payment.currency,
  );
  TestValidator.equals(
    "method_type unchanged",
    updated.method_type,
    payment.method_type,
  );
  TestValidator.equals(
    "customer unchanged",
    updated.customer,
    payment.customer,
  );
  TestValidator.equals(
    "provider unchanged",
    updated.provider,
    payment.provider,
  );
  TestValidator.equals(
    "external_payment_id unchanged",
    updated.external_payment_id,
    payment.external_payment_id,
  );
  TestValidator.equals(
    "transaction_token unchanged",
    updated.transaction_token,
    payment.transaction_token,
  );

  // updated_at should be greater or different from original
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updated.updated_at,
    payment.updated_at,
  );
}

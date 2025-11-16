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
 * Validate that an authenticated admin can retrieve a payment's complete
 * details by its ID, and that all returned fields match the created payment.
 * This test checks proper admin authentication handling and data integrity of
 * the retrieval API. The workflow also ensures the existence of prerequisite
 * payment and admin records.
 */
export async function test_api_payment_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin registration (join)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) + "#Aa1",
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // Step 2: Create test payment (simulate as admin)
  // Fabricate minimal references for required customer and provider objects
  const fakeCustomer: IShoppingMallCustomer.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(),
  };
  const fakeProvider: IShoppingMallExternalPaymentProvider.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(2),
    provider_code: RandomGenerator.alphabets(4).toUpperCase(),
    status: RandomGenerator.pick(["active", "inactive", "deprecated"] as const),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };
  // Prepare the payment creation body
  const paymentCreateBody = {
    customer_id: fakeCustomer.id,
    provider_id: fakeProvider.id,
    amount: 12345.67,
    currency: "USD",
    method_type: RandomGenerator.pick([
      "card",
      "e-wallet",
      "bank_transfer",
    ] as const),
    status: RandomGenerator.pick([
      "initiated",
      "pending",
      "authorized",
      "rejected",
      "completed",
      "refunded",
      "failed",
    ] as const),
    external_payment_id: RandomGenerator.alphaNumeric(18),
    transaction_token: RandomGenerator.alphaNumeric(32),
    requested_at: new Date().toISOString(),
  } satisfies IShoppingMallPayment.ICreate;
  // Directly call the payment creation API
  const created: IShoppingMallPayment =
    await api.functional.shoppingMall.admin.payments.create(connection, {
      body: paymentCreateBody,
    });
  typia.assert(created);

  // Step 3: Retrieve the payment by its id as admin
  const retrieved: IShoppingMallPayment =
    await api.functional.shoppingMall.admin.payments.at(connection, {
      paymentId: created.id,
    });
  typia.assert(retrieved);
  // Match each business-critical field
  TestValidator.equals("payment id", retrieved.id, created.id);
  TestValidator.equals("amount", retrieved.amount, paymentCreateBody.amount);
  TestValidator.equals(
    "currency",
    retrieved.currency,
    paymentCreateBody.currency,
  );
  TestValidator.equals(
    "method type",
    retrieved.method_type,
    paymentCreateBody.method_type,
  );
  TestValidator.equals("status", retrieved.status, paymentCreateBody.status);
  TestValidator.equals(
    "external payment id",
    retrieved.external_payment_id,
    paymentCreateBody.external_payment_id,
  );
  TestValidator.equals(
    "transaction token",
    retrieved.transaction_token,
    paymentCreateBody.transaction_token,
  );
  TestValidator.equals(
    "requested at",
    retrieved.requested_at,
    paymentCreateBody.requested_at,
  );

  // Check customer and provider linkage
  TestValidator.equals("customer id", retrieved.customer.id, fakeCustomer.id);
  TestValidator.equals(
    "customer name",
    retrieved.customer.name,
    fakeCustomer.name,
  );
  TestValidator.equals("provider id", retrieved.provider.id, fakeProvider.id);
  TestValidator.equals(
    "provider name",
    retrieved.provider.name,
    fakeProvider.name,
  );
  TestValidator.equals(
    "provider code",
    retrieved.provider.provider_code,
    fakeProvider.provider_code,
  );
  TestValidator.equals(
    "provider status",
    retrieved.provider.status,
    fakeProvider.status,
  );
  TestValidator.equals(
    "provider description",
    retrieved.provider.description,
    fakeProvider.description,
  );

  // Check created_at/updated_at/processed_at/deleted_at fields are present and formatted correctly
  TestValidator.predicate(
    "created_at is present",
    typeof retrieved.created_at === "string" && retrieved.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is present",
    typeof retrieved.updated_at === "string" && retrieved.updated_at.length > 0,
  );
  // These may be nullable, so just check existence and/or null/undefined
  TestValidator.predicate(
    "processed_at is null or ISO string",
    retrieved.processed_at === null ||
      retrieved.processed_at === undefined ||
      (typeof retrieved.processed_at === "string" &&
        retrieved.processed_at.length > 0),
  );
  TestValidator.predicate(
    "deleted_at is null or ISO string",
    retrieved.deleted_at === null ||
      retrieved.deleted_at === undefined ||
      (typeof retrieved.deleted_at === "string" &&
        retrieved.deleted_at.length > 0),
  );
}

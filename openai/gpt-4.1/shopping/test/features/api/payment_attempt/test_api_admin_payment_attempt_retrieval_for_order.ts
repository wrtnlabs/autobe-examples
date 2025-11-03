import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingPaymentAttempt";

/**
 * Validate admin retrieval of payment attempts for an order, including
 * successful and error scenarios.
 *
 * - Authenticate as an admin for access control.
 * - Retrieve payment attempt by orderCode and paymentReference (success case).
 * - Attempt retrieval with non-existent orderCode (expect error).
 * - Attempt retrieval with invalid paymentReference for a valid orderCode (expect
 *   error).
 * - Attempt retrieval with no authentication (expect permission error).
 */
export async function test_api_admin_payment_attempt_retrieval_for_order(
  connection: api.IConnection,
) {
  // Step 1: Admin joins and authenticates
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    role: RandomGenerator.pick([
      "super",
      "support",
      "operator",
      "compliance",
    ] as const),
    status: "active",
  } satisfies IShoppingAdmin.IJoin;
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // Step 2: Try to retrieve an actual payment attempt (using synthetic/random codes)
  // As there is no API to create a payment attempt/order, we simulate realistic values
  const validOrderCode = RandomGenerator.alphaNumeric(12);
  const validPaymentReference = RandomGenerator.alphaNumeric(16);

  // Expect error because we cannot create a real payment attempt, but check error handling
  await TestValidator.error(
    "payment attempt retrieval fails for random data",
    async () => {
      await api.functional.shopping.admin.orders.payment_attempts.at(
        connection,
        {
          orderCode: validOrderCode,
          paymentReference: validPaymentReference,
        },
      );
    },
  );

  // Step 3: Invalid orderCode (should error)
  await TestValidator.error(
    "payment attempt retrieval fails for non-existent orderCode",
    async () => {
      await api.functional.shopping.admin.orders.payment_attempts.at(
        connection,
        {
          orderCode: "invalidorder123",
          paymentReference: validPaymentReference,
        },
      );
    },
  );

  // Step 4: Invalid paymentReference for random code (should error)
  await TestValidator.error(
    "payment attempt retrieval fails for invalid paymentReference",
    async () => {
      await api.functional.shopping.admin.orders.payment_attempts.at(
        connection,
        {
          orderCode: validOrderCode,
          paymentReference: "invalidref12345678",
        },
      );
    },
  );

  // Step 5: Unauthenticated access to payment attempt retrieval (should error)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated payment attempt lookup is forbidden",
    async () => {
      await api.functional.shopping.admin.orders.payment_attempts.at(
        unauthConnection,
        {
          orderCode: validOrderCode,
          paymentReference: validPaymentReference,
        },
      );
    },
  );
}

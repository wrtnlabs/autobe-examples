import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";

/**
 * Verify that an authenticated customer can update their own basic profile
 * fields (email) through the customer-facing update endpoint.
 *
 * Business context:
 *
 * - Customers register via POST /auth/customer/join, which creates a
 *   shopping_mall_customers row and returns an
 *   IShoppingMallCustomer.IAuthorized payload including the customer id and an
 *   authorization token bound to the provided connection.
 * - The customer-facing PUT /shoppingMall/customer/customers/{customerId}
 *   endpoint accepts IShoppingMallCustomer.IUpdate and returns the refreshed
 *   IShoppingMallCustomer view of the underlying row.
 *
 * This test ensures that:
 *
 * 1. A freshly joined customer can update their own email using the same
 *    authenticated connection.
 * 2. Immutable/lifecycle fields behave correctly: id and created_at remain
 *    unchanged, deleted_at stays as it was (typically null), and updated_at
 *    moves forward after the update.
 * 3. Status and email_verified, which are conceptually admin-managed, are not
 *    altered when omitted from IUpdate.
 *
 * High-level steps:
 *
 * 1. Join a new customer via api.functional.auth.customer.join using a random
 *    IShoppingMallCustomerJoin.IRequest payload.
 * 2. Capture the baseline IShoppingMallCustomer.IAuthorized fields relevant to
 *    profile and lifecycle: id, email, status, email_verified, created_at,
 *    updated_at, deleted_at.
 * 3. Construct a new unique-looking email value and call
 *    api.functional.shoppingMall.customer.customers.update with:
 *
 *    - CustomerId = baseline.id
 *    - Body satisfying IShoppingMallCustomer.IUpdate containing only the email
 *         field.
 * 4. Assert via typia.assert that the response conforms to IShoppingMallCustomer,
 *    then validate business expectations via TestValidator:
 *
 *    - Id is unchanged and equals baseline.id
 *    - Email equals the new email and differs from the original email
 *    - Status is unchanged
 *    - Email_verified is unchanged
 *    - Created_at equals baseline.created_at
 *    - Deleted_at equals baseline.deleted_at (including null handling)
 *    - Updated_at is greater than or equal to baseline.updated_at (using string
 *         comparison on ISO 8601 timestamps as a proxy for temporal ordering).
 */
export async function test_api_customer_update_own_profile_basic_fields(
  connection: api.IConnection,
) {
  // 1. Join a new customer and capture baseline authorized payload
  const joinRequest = typia.random<IShoppingMallCustomerJoin.IRequest>();

  const authorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinRequest,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(authorized);

  const baselineId = authorized.id;
  const baselineEmail = authorized.email;
  const baselineStatus = authorized.status;
  const baselineEmailVerified = authorized.email_verified;
  const baselineCreatedAt = authorized.created_at;
  const baselineUpdatedAt = authorized.updated_at;
  const baselineDeletedAt = authorized.deleted_at ?? null;

  // 2. Prepare a new email that differs from the original one
  let newEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  if (newEmail === baselineEmail) {
    // In the unlikely event of collision, regenerate once more
    newEmail = typia.random<string & tags.Format<"email">>();
  }

  // 3. Call customer update endpoint to change only the email
  const updated: IShoppingMallCustomer =
    await api.functional.shoppingMall.customer.customers.update(connection, {
      customerId: baselineId,
      body: {
        email: newEmail,
      } satisfies IShoppingMallCustomer.IUpdate,
    });
  typia.assert<IShoppingMallCustomer>(updated);

  // 4. Business validations
  TestValidator.equals("id remains unchanged", updated.id, baselineId);

  TestValidator.equals(
    "email is updated to new value",
    updated.email,
    newEmail,
  );
  TestValidator.notEquals(
    "email differs from original email",
    updated.email,
    baselineEmail,
  );

  TestValidator.equals(
    "status remains unchanged when omitted from update body",
    updated.status,
    baselineStatus,
  );

  TestValidator.equals(
    "email_verified remains unchanged when omitted from update body",
    updated.email_verified,
    baselineEmailVerified,
  );

  TestValidator.equals(
    "created_at remains unchanged after update",
    updated.created_at,
    baselineCreatedAt,
  );

  const updatedDeletedAt = updated.deleted_at ?? null;
  TestValidator.equals(
    "deleted_at remains unchanged after update",
    updatedDeletedAt,
    baselineDeletedAt,
  );

  TestValidator.predicate(
    "updated_at is same or later than baseline updated_at",
    updated.updated_at >= baselineUpdatedAt,
  );
}

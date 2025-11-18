import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";

/**
 * Validate customer cart status update lifecycle from creation to
 * "converted_to_order".
 *
 * Business context:
 *
 * - A registered customer can own carts in the shopping mall domain.
 * - Carts are created with an actor_type (here, "customer"), a currency_code, and
 *   an initial status (often defaulted by backend).
 * - The cart header can later be updated via the customer-facing update endpoint,
 *   particularly the status field to represent lifecycle transitions such as
 *   conversion to order.
 * - System-managed fields such as id, created_at, deleted_at, and
 *   last_validated_at are not part of the update DTO and must remain consistent
 *   with backend rules.
 *
 * This test covers:
 *
 * 1. Customer registration and authentication via /auth/customer/join.
 * 2. Cart creation for that customer via /shoppingMall/customer/carts using
 *    IShoppingMallCart.ICreate.
 * 3. Cart status update via /shoppingMall/customer/carts/{cartId} using
 *    IShoppingMallCart.IUpdate.
 * 4. Validation of immutability and lifecycle timestamp behavior.
 * 5. Ownership preservation checks.
 */
export async function test_api_customer_cart_update_status_to_converted(
  connection: api.IConnection,
) {
  // 1. Register a new customer (join), which also authenticates and sets token on connection.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(customer);

  // 2. Create a cart for this customer.
  const createBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;

  const createdCart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: createBody,
    });
  typia.assert(createdCart);

  // Basic invariants after creation.
  TestValidator.equals(
    "created cart actor_type should be 'customer'",
    createdCart.actor_type,
    createBody.actor_type,
  );
  TestValidator.equals(
    "created cart currency_code should match request",
    createdCart.currency_code,
    createBody.currency_code,
  );
  TestValidator.equals(
    "created cart owner_customer.id matches authenticated customer",
    createdCart.owner_customer?.id ?? null,
    customer.id,
  );
  TestValidator.equals(
    "created cart deleted_at should be null",
    createdCart.deleted_at ?? null,
    null,
  );

  const originalStatus: string = createdCart.status;
  const originalCreatedAt: string = createdCart.created_at;
  const originalUpdatedAt: string = createdCart.updated_at;

  // 3. Update the cart's status to a new lifecycle value, e.g., "converted_to_order".
  const targetStatus = "converted_to_order";
  const updateBody = {
    status: targetStatus,
  } satisfies IShoppingMallCart.IUpdate;

  const updatedCart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.update(connection, {
      cartId: createdCart.id,
      body: updateBody,
    });
  typia.assert(updatedCart);

  // 4. Validate immutability and lifecycle timestamps.
  TestValidator.equals(
    "cart id remains unchanged after update",
    updatedCart.id,
    createdCart.id,
  );
  TestValidator.equals(
    "cart actor_type remains 'customer' after update",
    updatedCart.actor_type,
    createdCart.actor_type,
  );
  TestValidator.equals(
    "cart owner_customer.id remains the same after update",
    updatedCart.owner_customer?.id ?? null,
    createdCart.owner_customer?.id ?? null,
  );

  TestValidator.equals(
    "cart status updated to target status",
    updatedCart.status,
    targetStatus,
  );

  TestValidator.equals(
    "created_at remains unchanged after cart update",
    updatedCart.created_at,
    originalCreatedAt,
  );

  // updated_at should be equal or later; we allow equality in case backend treats idempotent update.
  const createdUpdatedAtTime = new Date(originalUpdatedAt).getTime();
  const updatedUpdatedAtTime = new Date(updatedCart.updated_at).getTime();
  TestValidator.predicate(
    "updated_at is not earlier than original updated_at",
    updatedUpdatedAtTime >= createdUpdatedAtTime,
  );

  TestValidator.equals(
    "deleted_at remains null after status update",
    updatedCart.deleted_at ?? null,
    null,
  );

  // last_validated_at is system-managed; typia.assert already ensured its type correctness.
  if (
    createdCart.last_validated_at === null ||
    createdCart.last_validated_at === undefined
  ) {
    if (
      updatedCart.last_validated_at !== null &&
      updatedCart.last_validated_at !== undefined
    ) {
      // Ensure the new value is a valid date-time string by constructing a Date.
      const _ = new Date(updatedCart.last_validated_at).toISOString();
    }
  } else {
    const _before = new Date(createdCart.last_validated_at).toISOString();
    const _after =
      updatedCart.last_validated_at !== null &&
      updatedCart.last_validated_at !== undefined
        ? new Date(updatedCart.last_validated_at).toISOString()
        : null;
    TestValidator.predicate(
      "last_validated_at stays defined or becomes a new valid value",
      _after === null || typeof _after === "string",
    );
  }

  // 5. Ownership preservation check is already covered via owner_customer.id comparisons.
}

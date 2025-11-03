import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";

/**
 * Test updating a customer's profile (name, phone) with valid input.
 *
 * 1. Register a new customer account and obtain session (authenticated context).
 * 2. Update the profile with a new valid name and phone.
 * 3. Verify that the changes are correctly reflected and other fields remain
 *    unchanged.
 */
export async function test_api_customer_profile_update_success(
  connection: api.IConnection,
) {
  // 1. Register (join) new customer
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies IShoppingCustomer.ICreate;
  const joined: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: createBody });
  typia.assert(joined);

  // 2. Update profile with new random name and phone (different from originals)
  const updateBody = {
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingCustomer.IUpdate;
  const updated: IShoppingCustomer =
    await api.functional.shopping.customer.customers.update(connection, {
      customerId: joined.id,
      body: updateBody,
    });
  typia.assert(updated);

  // 3. Business and type assertions
  // id, email unchanged
  TestValidator.equals("id must not change", updated.id, joined.id);
  TestValidator.equals(
    "email must not change",
    updated.email,
    createBody.email,
  );
  // name and phone updated
  TestValidator.equals("name updated", updated.name, updateBody.name);
  TestValidator.equals("phone updated", updated.phone, updateBody.phone);
  // Ensure is_active still true
  TestValidator.equals("is_active must be true", updated.is_active, true);
  // Ensure deleted_at is null or undefined
  TestValidator.equals(
    "deleted_at null or undefined",
    updated.deleted_at ?? null,
    null,
  );
  // created_at/updated_at: updated_at must be same or after created_at
  TestValidator.predicate(
    "updated_at same or after created_at",
    new Date(updated.updated_at) >= new Date(updated.created_at),
  );
}

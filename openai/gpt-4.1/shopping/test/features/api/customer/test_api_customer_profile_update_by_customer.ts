import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test that a customer can update their own profile fields (name, email, phone)
 * and that business rules are enforced about field mutability and uniqueness.
 *
 * Steps:
 *
 * 1. Register a new customer and authenticate (join). Save details for later
 *    comparison.
 * 2. Attempt a legal update of profile fields (change name, email, phone) and
 *    verify changes are effective on the returned record.
 * 3. Ensure immutable fields (id, created_at) are unchanged, and updated_at is
 *    properly changed.
 * 4. Try updating a field with an existing (duplicate) email - expect error by
 *    uniqueness constraint.
 * 5. Verify that no sensitive authentication fields are exposed in update response
 *    (e.g. no password hash).
 * 6. (If present) Confirm that audit logging is observable through updated_at
 *    change or by system effects, as direct API response doesn't expose audit
 *    records.
 */
export async function test_api_customer_profile_update_by_customer(
  connection: api.IConnection,
) {
  // 1. Register customer1 (main test subject)
  const email1 = typia.random<string & tags.Format<"email">>();
  const password1 = RandomGenerator.alphaNumeric(10) + "Zz!1";
  const joinBody1 = {
    email: email1,
    password: password1,
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;
  const authorized1 = await api.functional.auth.customer.join(connection, {
    body: joinBody1,
  });
  typia.assert(authorized1);
  const oldProfile = { ...authorized1 };

  // 2. Update profile with new name, email, phone
  const newName = RandomGenerator.name();
  const newPhone = RandomGenerator.mobile();
  const newEmail = typia.random<string & tags.Format<"email">>();
  const updateBody = {
    name: newName,
    phone: newPhone,
    email: newEmail,
  } satisfies IShoppingMallCustomer.IUpdate;
  const updated = await api.functional.shoppingMall.customer.customers.update(
    connection,
    { customerId: authorized1.id, body: updateBody },
  );
  typia.assert(updated);

  // 3. Validate profile fields updated, immutable fields preserved, updated_at changes
  TestValidator.equals("customer id retained", updated.id, oldProfile.id);
  TestValidator.notEquals(
    "updated_at must change",
    updated.updated_at,
    oldProfile.updated_at,
  );
  TestValidator.equals(
    "created_at must not change",
    updated.created_at,
    oldProfile.created_at,
  );
  TestValidator.equals("name updated", updated.name, newName);
  TestValidator.equals("phone updated", updated.phone, newPhone);
  TestValidator.equals("email updated", updated.email, newEmail);
  TestValidator.equals(
    "is_email_verified must not change",
    updated.is_email_verified,
    oldProfile.is_email_verified,
  );

  // 4. Register a second customer to setup duplicate email scenario
  const email2 = typia.random<string & tags.Format<"email">>();
  const password2 = RandomGenerator.alphaNumeric(10) + "Xy!2";
  const joinBody2 = {
    email: email2,
    password: password2,
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;
  const authorized2 = await api.functional.auth.customer.join(connection, {
    body: joinBody2,
  });
  typia.assert(authorized2);

  // 5. Attempt to update email to duplicate value (expect uniqueness error)
  await TestValidator.error(
    "updating email to duplicate should fail",
    async () => {
      await api.functional.shoppingMall.customer.customers.update(connection, {
        customerId: authorized1.id,
        body: { email: email2 } satisfies IShoppingMallCustomer.IUpdate,
      });
    },
  );

  // 6. Check that update response does not expose any sensitive authentication fields (no password, password_hash, or raw token fields)
  TestValidator.predicate(
    "update response does not include sensitive fields",
    typeof (updated as any).password === "undefined" &&
      typeof (updated as any).password_hash === "undefined" &&
      typeof (updated as any).token === "undefined",
  );
}

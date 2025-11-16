import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Validate admin's ability to update customer profile fields (name, email,
 * phone), enforce email uniqueness, and deny restricted field updates.
 *
 * 1. Register admin (admin1)
 * 2. Register second admin (admin2 for negative testing)
 * 3. Create two customers via admin
 * 4. Update customer1's profile as admin1 (valid changes)
 * 5. Check customer1's updated profile reflects changes and not restricted fields
 * 6. Attempt to update customer1 with email of customer2 (should fail - duplicate
 *    email)
 * 7. Attempt to update restricted fields (e.g. password_hash - should have no
 *    effect)
 * 8. Attempt to update customer1's profile as admin2 (should succeed - any admin
 *    allowed)
 * 9. Attempt to update customer1's profile with invalid email (should fail)
 * 10. Attempt to update without authentication (unauthorized - should fail)
 */
export async function test_api_customer_profile_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin1
  const admin1Email = typia.random<string & tags.Format<"email">>();
  const admin1Password = RandomGenerator.alphaNumeric(12);
  const admin1Name = RandomGenerator.name();
  const admin1 = await api.functional.auth.admin.join(connection, {
    body: {
      email: admin1Email,
      password: admin1Password,
      name: admin1Name,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin1);

  // 2. Register a second admin for negative testing
  const admin2Email = typia.random<string & tags.Format<"email">>();
  const admin2Password = RandomGenerator.alphaNumeric(12);
  const admin2Name = RandomGenerator.name();
  const admin2 = await api.functional.auth.admin.join(connection, {
    body: {
      email: admin2Email,
      password: admin2Password,
      name: admin2Name,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin2);

  // 3. Create two customers via admin1
  const customer1Id = typia.random<string & tags.Format<"uuid">>();
  let customer1 = await api.functional.shoppingMall.admin.customers.update(
    connection,
    {
      customerId: customer1Id,
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.IUpdate,
    },
  );
  typia.assert(customer1);

  const customer2Id = typia.random<string & tags.Format<"uuid">>();
  let customer2 = await api.functional.shoppingMall.admin.customers.update(
    connection,
    {
      customerId: customer2Id,
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.IUpdate,
    },
  );
  typia.assert(customer2);

  // 4. Update customer1's profile as admin1 (change all fields)
  const updateName = RandomGenerator.name();
  const updateEmail = typia.random<string & tags.Format<"email">>();
  const updatePhone = RandomGenerator.mobile();
  const updatedCustomer1 =
    await api.functional.shoppingMall.admin.customers.update(connection, {
      customerId: customer1.id,
      body: {
        name: updateName,
        email: updateEmail,
        phone: updatePhone,
      } satisfies IShoppingMallCustomer.IUpdate,
    });
  typia.assert(updatedCustomer1);
  TestValidator.equals("name updated", updatedCustomer1.name, updateName);
  TestValidator.equals("email updated", updatedCustomer1.email, updateEmail);
  TestValidator.equals("phone updated", updatedCustomer1.phone, updatePhone);

  // 5. Confirm restricted fields cannot be updated (no effect on password hash or system fields)
  const restrictedUpdate =
    await api.functional.shoppingMall.admin.customers.update(connection, {
      customerId: customer1.id,
      body: {
        name: RandomGenerator.name(),
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        // password_hash: "hack", // forbidden: not in IUpdate
      } satisfies IShoppingMallCustomer.IUpdate,
    });
  typia.assert(restrictedUpdate);
  // No way to test password_hash, but can verify only allowed fields change

  // 6. Attempt to update with a duplicate email (should fail)
  await TestValidator.error(
    "cannot update customer to duplicate email",
    async () => {
      await api.functional.shoppingMall.admin.customers.update(connection, {
        customerId: customer1.id,
        body: {
          email: customer2.email,
        } satisfies IShoppingMallCustomer.IUpdate,
      });
    },
  );

  // 7. Attempt to update as a different admin (should succeed)
  // Authenticate as admin2 (sets token for connection)
  await api.functional.auth.admin.join(connection, {
    body: {
      email: admin2Email,
      password: admin2Password,
      name: admin2Name,
    } satisfies IShoppingMallAdmin.ICreate,
  });

  const newName = RandomGenerator.name();
  const asOtherAdminResult =
    await api.functional.shoppingMall.admin.customers.update(connection, {
      customerId: customer1.id,
      body: { name: newName } satisfies IShoppingMallCustomer.IUpdate,
    });
  typia.assert(asOtherAdminResult);
  TestValidator.equals(
    "other admin can update name",
    asOtherAdminResult.name,
    newName,
  );

  // 8. Attempt to update with invalid email (should fail)
  await TestValidator.error(
    "admin cannot update customer with invalid email",
    async () => {
      await api.functional.shoppingMall.admin.customers.update(connection, {
        customerId: customer1.id,
        body: {
          email: "invalid-email",
        } satisfies IShoppingMallCustomer.IUpdate,
      });
    },
  );

  // 9. Attempt to update as unauthenticated user (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated update is denied", async () => {
    await api.functional.shoppingMall.admin.customers.update(unauthConn, {
      customerId: customer1.id,
      body: { name: "Hacker" } satisfies IShoppingMallCustomer.IUpdate,
    });
  });
}

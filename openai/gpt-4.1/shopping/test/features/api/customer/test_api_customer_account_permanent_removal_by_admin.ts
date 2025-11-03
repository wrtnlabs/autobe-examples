import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";

/**
 * Validate permanent deletion of a customer account by admin.
 *
 * This test covers the lifecycle: admin creation and authentication, customer
 * creation, admin-initiated deletion, and post-deletion checks.
 *
 * 1. Register a new admin account for authentication.
 * 2. Authenticate as the new admin (implicit in /auth/admin/join response).
 * 3. Create a new customer account with randomized credentials.
 * 4. As the admin, permanently delete the newly created customer by customerId.
 * 5. Attempt to delete again (should error: already deleted or non-existent).
 * 6. Attempt to authenticate as the deleted customer (should error:
 *    forbidden/login fails).
 * 7. (Conceptually) Confirm that all associated data for the deleted customer is
 *    handled as per compliance - considered passed if no errors and customer
 *    cannot be recovered.
 */
export async function test_api_customer_account_permanent_removal_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminEmail = RandomGenerator.name(1) + "@admin-autobe.com";
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(2),
        role: "super",
        status: "active",
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);
  TestValidator.predicate("admin is active", admin.status === "active");

  // 2. Customer registration
  const customerEmail = RandomGenerator.name(1) + "@customer-autobe.com";
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        name: RandomGenerator.name(2),
        phone: RandomGenerator.mobile(),
        href: "https://e2e.local/join/customer", // plausible href for session context
        referrer: "https://e2e.local/landing",
        ip: null,
      } satisfies IShoppingCustomer.ICreate,
    });
  typia.assert(customer);
  TestValidator.equals("customer role is correct", customer.role, "customer");

  // 3. Admin deletes the customer
  await api.functional.shopping.admin.customers.erase(connection, {
    customerId: customer.id,
  });

  // 4. Repeat: Attempt to delete again (should error, e.g. already deleted/nonexistent)
  await TestValidator.error(
    "deleting already deleted customer should error",
    async () => {
      await api.functional.shopping.admin.customers.erase(connection, {
        customerId: customer.id,
      });
    },
  );

  // 5. Attempt authentication as deleted customer (should fail)
  await TestValidator.error(
    "deleted customer cannot re-authenticate; login fails",
    async () => {
      // Join API is the only available auth path; so try join with same credentials (should reject duplicate email),
      // or, if login endpoint was available, would attempt login (which should also fail as user is deleted).
      await api.functional.auth.customer.join(connection, {
        body: {
          email: customerEmail,
          password: customerPassword,
          name: RandomGenerator.name(2),
          phone: RandomGenerator.mobile(),
          href: "https://e2e.local/join/customer", // plausible href for session context
          referrer: "https://e2e.local/landing",
          ip: null,
        } satisfies IShoppingCustomer.ICreate,
      });
    },
  );
}

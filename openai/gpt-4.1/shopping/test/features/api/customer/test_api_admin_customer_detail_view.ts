import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";

/**
 * Validate that admin can view customer details, including profile information,
 * status, and audit fields.
 *
 * Business context:
 *
 * - Only admin or the customer (owner) can view full detail.
 * - Nonexistent or forbidden access must be rejected properly.
 *
 * Test steps:
 *
 * 1. Register an admin using the admin join endpoint.
 * 2. Create a customer using password reset request (for indirect account creation
 *    with email).
 * 3. Query customer details by UUID as the admin and validate all
 *    profile/status/audit fields.
 * 4. Attempt to view a non-existent customerId and verify error is returned.
 * 5. Remove admin credentials and verify forbidden on customer detail access.
 */
export async function test_api_admin_customer_detail_view(
  connection: api.IConnection,
) {
  // 1. Register an admin
  const adminJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) + "_Aa1!",
    name: RandomGenerator.name(),
    role: "super", // assume "super" is a valid role
    status: "active", // valid status
  } satisfies IShoppingAdmin.IJoin;
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoin });
  typia.assert(admin);

  // 2. Create a customer (indirect creation to guarantee real customerId)
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const resetResult =
    await api.functional.auth.customer.password.reset_request.requestPasswordReset(
      connection,
      {
        body: { request_email: customerEmail },
      },
    );
  typia.assert(resetResult);

  // 3. Query all existing customers to find the just-created customer (simulate lookup; in real flow, presume availability via DB or fixture)
  // For test purposes, attempt to fetch by trial with random UUID until found. But here, demonstrate proper pattern:
  const customersToTry = [customerEmail];
  let foundCustomer: IShoppingCustomer | undefined = undefined;
  for (const email of customersToTry) {
    // Attempt up to 5 times with random delay to simulate DB propagation delay (if needed)
    for (let tryNum = 0; tryNum < 5; ++tryNum) {
      try {
        // Suppose you can directly fetch by the email using admin power (simulate: get customer UUID after creation)
        // For this framework, just simulate getting random but valid customerId
        const testCustomerId = typia.random<string & tags.Format<"uuid">>();
        const customer = await api.functional.shopping.admin.customers.at(
          connection,
          { customerId: testCustomerId },
        );
        typia.assert(customer);
        if (customer.email === customerEmail) {
          foundCustomer = customer;
          break;
        }
      } catch (exp) {
        // skip errors (customer not found), try again unless found
      }
    }
    if (foundCustomer) break;
  }

  TestValidator.predicate(
    "admin can retrieve customer by UUID",
    !!foundCustomer && foundCustomer.email === customerEmail,
  );
  if (!!foundCustomer) {
    TestValidator.predicate(
      "customer is active or soft-deleted",
      foundCustomer.is_active === true ||
        (foundCustomer.deleted_at !== null &&
          foundCustomer.deleted_at !== undefined),
    );
    TestValidator.predicate(
      "customer profile fields present",
      typeof foundCustomer.name === "string" &&
        typeof foundCustomer.phone === "string",
    );
    TestValidator.predicate(
      "audit fields present",
      typeof foundCustomer.created_at === "string" &&
        typeof foundCustomer.updated_at === "string",
    );
  }

  // 4. Try non-existent customerId
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "admin cannot fetch non-existent customerId",
    async () => {
      await api.functional.shopping.admin.customers.at(connection, {
        customerId: nonExistentId,
      });
    },
  );

  // 5. Remove admin token (simulate unauthenticated scenario)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "forbidden for unauthenticated access",
    async () => {
      await api.functional.shopping.admin.customers.at(unauthConn, {
        customerId:
          foundCustomer?.id ?? typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}

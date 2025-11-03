import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";

/**
 * Validates successful registration of a new admin account for the shopping
 * mall backend.
 *
 * This test targets the /auth/admin/join endpoint, ensuring that a new admin
 * can join the platform with a unique business email, secure password, real
 * audit-compliant name, specifically assigned role, and default status
 * (typically 'active').
 *
 * Test Steps:
 *
 * 1. Generate unique random values for all required fields:
 *
 *    - Unique business email
 *    - Complex password (8-128 chars)
 *    - Real name (1-100 chars)
 *    - Role (2-32 chars, allowed values)
 *    - Status ('active', compliant)
 * 2. Register the new admin.
 * 3. Inspect the result:
 *
 *    - Verify that the response shape matches IShoppingAdmin.IAuthorized
 *    - Confirm tokens are present and of proper format
 *    - Inspect audit-related fields and role/status correctness
 * 4. Attempt to register again with the same email, expecting error due to
 *    uniqueness restriction.
 *
 * Returns nothing if all validations pass.
 */
export async function test_api_admin_registration_success(
  connection: api.IConnection,
) {
  // 1. Prepare unique, policy-compliant admin registration data
  const uniqueEmail = RandomGenerator.alphabets(8) + "@company-admin.com";
  const strongPassword = RandomGenerator.alphaNumeric(16) + "!Aa1"; // ensure complexity
  const adminName = RandomGenerator.name();
  const allowedRoles = ["super", "support", "compliance", "operator"] as const;
  const role = RandomGenerator.pick(allowedRoles);
  const allowedStatuses = ["active", "pending", "suspended", "locked"] as const;
  const status = "active"; // prefer default valid status

  const registrationBody = {
    email: uniqueEmail as string & tags.Format<"email">,
    password: strongPassword as string &
      tags.MinLength<8> &
      tags.MaxLength<128>,
    name: adminName as string & tags.MinLength<1> & tags.MaxLength<100>,
    role: role as string & tags.MinLength<2> & tags.MaxLength<32>,
    status: status as string & tags.MinLength<3> & tags.MaxLength<20>,
  } satisfies IShoppingAdmin.IJoin;

  // 2. Register new admin
  const output = await api.functional.auth.admin.join(connection, {
    body: registrationBody,
  });
  typia.assert<typeof output>(output);

  // 3. Validate output structure/content
  TestValidator.equals(
    "registered admin email matches",
    output.email,
    registrationBody.email,
  );
  TestValidator.equals(
    "registered admin name matches",
    output.name,
    registrationBody.name,
  );
  TestValidator.equals(
    "admin role matches",
    output.role,
    registrationBody.role,
  );
  TestValidator.equals("admin status is active", output.status, "active");

  // Validate audit fields presence and formats
  TestValidator.predicate("created_at is ISO", /T.*Z$/.test(output.created_at));
  TestValidator.predicate("updated_at is ISO", /T.*Z$/.test(output.updated_at));
  TestValidator.predicate("token exists", typeof output.token === "object");
  typia.assert<IShoppingAuthorizationToken>(output.token);

  // 4. Ensure duplicate registration with same email is rejected
  await TestValidator.error("duplicate email registration fails", async () => {
    await api.functional.auth.admin.join(connection, {
      body: registrationBody,
    });
  });
}

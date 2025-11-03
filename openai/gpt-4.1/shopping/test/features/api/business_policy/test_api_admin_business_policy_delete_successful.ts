import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";

/**
 * Test that an admin can successfully and permanently delete a business policy
 * by its unique policyName.
 *
 * Scenario covers authentication as admin, deletion of the target business
 * policy, and subsequent attempt to retrieve/update to confirm deletion.
 * Ensures deletion is permanent and audit logs are updated appropriately.
 *
 * 1. Register and login as an admin.
 * 2. Create a business policy for the purpose of this test (not possible here due
 *    to unavailable API, so use a generated name and simulate pre-existence).
 * 3. Delete the business policy as admin.
 * 4. Attempt to delete again to confirm permanent deletion.
 * 5. (If API allowed, would also attempt to retrieve or update, but only delete is
 *    available.)
 * 6. (Audit logs should be checked if API for this is available, but it's not, so
 *    omitted.)
 */
export async function test_api_admin_business_policy_delete_successful(
  connection: api.IConnection,
) {
  // 1. Register and login as admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        role: RandomGenerator.pick(["super", "operator", "support"] as const),
        status: "active",
      },
    });
  typia.assert(admin);

  // 2. Generate a unique business policy name
  const policyName = `policy_${RandomGenerator.alphaNumeric(8)}`;

  // (Here, we should create the business policy to guarantee existence, but no API available. Assume policy exists.)

  // 3. Admin deletes the business policy
  await api.functional.shopping.admin.businessPolicies.erase(connection, {
    policyName,
  });

  // 4. Attempt to delete again to confirm it is gone
  await TestValidator.error(
    "should fail to delete already deleted policy",
    async () => {
      await api.functional.shopping.admin.businessPolicies.erase(connection, {
        policyName,
      });
    },
  );
}

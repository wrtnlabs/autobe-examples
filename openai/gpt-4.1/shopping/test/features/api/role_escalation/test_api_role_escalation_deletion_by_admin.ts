import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Validate that a platform administrator can delete a role escalation request.
 *
 * This test covers the minimum possible path required by the current API
 * surface: (1) Create/register a new administrator; (2) Verify authentication
 * (implicit via join, admin token granted); (3) Attempt deletion of a
 * dummy/random role escalation UUID; (4) Assert delete function completes as
 * expected without errors. Since there is no API for creating/listing role
 * escalation requests, the test uses a random UUID for deletion and assumes the
 * focus is correct permission usage and correct HTTP result.
 *
 * 1. Generate unique random credentials for admin registration
 * 2. Register as new admin, authenticate, and validate returned
 *    IShoppingMallAdmin.IAuthorized structure
 * 3. As platform admin (implicit auth), attempt to delete a random role escalation
 *    request
 * 4. Assert the DELETE operation succeeds with no error (API returns void)
 */
export async function test_api_role_escalation_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin and authenticate implicit
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallAdmin.ICreate;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminBody,
  });
  typia.assert(admin);

  // 2. Attempt delete with a random UUID (since creation/list/listing is not exposed)
  const randomRoleEscalationId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.shoppingMall.admin.roleEscalations.erase(connection, {
    roleEscalationId: randomRoleEscalationId,
  });
}

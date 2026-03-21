import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

/**
 * Test that soft-deleted custom roles are not accessible through the role retrieval endpoint.
 *
 * Validates that deleted roles (whether soft or hard deleted) return 404 when attempting
 * to retrieve them via the at endpoint. The endpoint filters out soft-deleted records
 * via the deleted_at IS NULL filter.
 *
 * Test Flow:
 * 1. Create an authenticated member with organization
 * 2. Create a custom role within the organization
 * 3. Delete the custom role
 * 4. Attempt to retrieve the deleted role by ID
 * 5. Verify that a 404 Not Found error is returned
 */
export async function test_api_role_soft_deleted_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an authenticated member with organization
  // The authorize_member_join utility creates a member and their first organization
  // The member becomes the owner with full permissions
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorizedMember);
  // Step 2: Create a custom role within the organization
  // Using the utility function to create a role with the authenticated member's context
  const customRole = await generate_random_erp_hrm_member_roles_create(
    memberConnection,
    {
      body: {
        name: `Test Role ${RandomGenerator.alphaNumeric(8)}`,
        permissions: ["employee:view", "project:view"],
      },
    },
  );
  typia.assert(customRole);
  // Verify business logic: custom roles are not builtin
  TestValidator.equals(
    "custom role is not builtin",
    customRole.is_builtin,
    false,
  );
  // Step 3: Delete the custom role
  // After deletion, the role should no longer be accessible
  await api.functional.erpHrm.member.roles.erase(memberConnection, {
    roleId: customRole.id,
  });
  // Step 4 & 5: Attempt to retrieve the deleted role and verify 404 error
  // The at endpoint returns 404 for roles that don't exist or are soft-deleted
  await TestValidator.httpError(
    "deleted role should not be found",
    404,
    async () => {
      await api.functional.erpHrm.member.roles.at(memberConnection, {
        roleId: customRole.id,
      });
    },
  );
}

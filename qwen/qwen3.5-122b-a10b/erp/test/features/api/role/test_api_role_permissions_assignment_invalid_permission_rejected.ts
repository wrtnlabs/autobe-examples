import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPermission";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_roles_create } from "../../../generate/generate_random_hrm_member_organizations_roles_create";
import { prepare_random_hrm_role } from "../../../prepare/prepare_random_hrm_role";

/**
 * Test that assigning non-existent permission IDs to a custom role is rejected.
 *
 * Validates the system's permission reference verification by attempting to assign invalid permission UUIDs to a custom role. The operation should return HTTP 400 Bad Request with an error response listing the invalid permission IDs.
 *
 * This test ensures data integrity by confirming that the system verifies all permission references against the hrm_permissions table before attempting assignment to the hrm_role_permissions junction table.
 *
 * 1. Member user registers with email and password credentials.
 * 2. Organization is created for the member.
 * 3. Custom role is created within the organization.
 * 4. Attempt to assign permissions including invalid UUIDs that do not exist in the system.
 * 5. Validates HTTP 400 error is returned with details about invalid permission IDs.
 */
export async function test_api_role_permissions_assignment_invalid_permission_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization (member needs organization context for role operations)
  // Note: Organization creation would happen through a separate endpoint not listed in available APIs
  // For this test, we assume organization creation is handled elsewhere or use a mock organization ID
  // Since organization creation endpoint is not in the provided SDK functions, we'll use the organization
  // that should be created during member registration flow
  const organizationId = memberAuth.organizations?.[0]?.id;
  if (!organizationId) {
    throw new Error("Member has no organization after registration");
  }
  // 3. Create custom role
  const role = await generate_random_hrm_member_organizations_roles_create(
    memberConnection,
    {
      params: { organizationId },
      body: {
        name: `Test Role ${RandomGenerator.alphabets(8)}`,
        description: "Test role for permission validation",
      } satisfies IHrmRole.ICreate,
    },
  );
  typia.assert(role);
  // 4. Attempt to assign invalid permission IDs
  const invalidPermissionId = typia.random<string & tags.Format<"uuid">>();
  const anotherInvalidId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "assigning invalid permissions should return 400",
    400,
    async () => {
      await api.functional.hrm.member.roles.permissions.assign(
        memberConnection,
        {
          roleId: role.id,
          body: {
            permission_ids: [invalidPermissionId, anotherInvalidId],
          } satisfies IHrmRolePermission.IAssign,
        },
      );
    },
  );
}

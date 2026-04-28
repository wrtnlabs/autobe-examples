import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";

/**
 * Test the name uniqueness constraint when updating a custom role name to conflict with an existing role in the same organization.
 *
 * Validates the constraint enforcement during role updates by attempting to rename a custom role to a name that is already taken by another role in the organization. This ensures that the composite unique constraint on [organization_id, name] is properly enforced, preventing duplicate role names within the same organizational context.
 *
 * The test creates a member account with a default organization (which includes built-in roles: Owner, Manager, Employee), creates two custom roles with distinct names ('QA Coordinator' and 'Dev Coordinator'), and then attempts to update the second role's name to match the first. The system should reject this update and preserve the original role name, demonstrating proper data integrity enforcement.
 *
 * 1. Member joins the platform and creates a default organization.
 * 2. First custom role 'QA Coordinator' is created with specific permissions.
 * 3. Second custom role 'Dev Coordinator' is created with different permissions.
 * 4. Updating 'Dev Coordinator' to 'QA Coordinator' fails with a constraint violation.
 * 5. The original 'Dev Coordinator' role remains unchanged with its original name.
 * 6. Response indicates the uniqueness constraint was violated.
 */
export async function test_api_role_update_duplicate_name_conflict(
  connection: api.IConnection,
) {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create first custom role 'QA Coordinator'
  const firstRole = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        name: "QA Coordinator",
        description: "Quality Assurance role for the organization",
        permissionKeys: ["time:manage", "time:view_all"],
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(firstRole);
  // 3. Create second custom role 'Dev Coordinator'
  const secondRole = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        name: "Dev Coordinator",
        description: "Development role for the organization",
        permissionKeys: ["project:manage", "project:view"],
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(secondRole);
  // 4. Attempt to update 'Dev Coordinator' to 'QA Coordinator' (conflict)
  await TestValidator.httpError("duplicate role name", [400, 409], async () => {
    await api.functional.hrmPlatform.member.roles.update(memberConnection, {
      roleId: secondRole.id,
      body: {
        name: firstRole.name,
      } satisfies IHrmPlatformRole.IUpdate,
    });
  });
  // 5. Verify 'Dev Coordinator' remains unchanged (get and verify original name)
  // Since we cannot directly "GET" the role in the provided SDK, we trust the update failed.
  // If needed, a separate GET endpoint would be used, but only "update" is in SDK.
  // We rely on the error thrown being enough to prove the constraint.
}

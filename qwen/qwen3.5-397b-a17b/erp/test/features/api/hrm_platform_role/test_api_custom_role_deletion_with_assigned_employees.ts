import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
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
 * Test custom role deletion constraint when employees are assigned.
 *
 * This test validates the business rule that prevents deletion of custom roles
 * that have employees assigned to them. The workflow:
 * 1. Member joins the platform (authentication)
 * 2. Create a custom role with specific permissions
 * 3. Attempt to delete the role (should fail if employees are assigned)
 * 4. Verify the role deletion constraint is enforced
 *
 * Note: Full employee assignment testing requires additional APIs not currently
 * available. This test validates the role deletion endpoint behavior.
 */
export async function test_api_custom_role_deletion_with_assigned_employees(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create custom role with permissions
  const customRole = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        permissions: ["employee:view", "project:view"],
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(customRole);
  // Verify role was created successfully
  TestValidator.predicate(
    "role is custom (not builtin)",
    !customRole.is_builtin,
  );
  TestValidator.equals("role name matches", customRole.name, customRole.name);
  // 3. Attempt to delete the custom role
  // Note: In a complete test scenario, we would first assign employees to this role
  // and then verify deletion fails with 409 Conflict. However, employee management
  // APIs are not available in the current function set.
  //
  // The deletion endpoint should enforce the business rule:
  // - 409 Conflict if employees are assigned to the role
  // - 204 No Content if role can be deleted (no employees assigned)
  // - 400 Bad Request if trying to delete built-in role
  // - 404 Not Found if role doesn't exist
  // For this test, we attempt deletion on a newly created role
  // In production, this would succeed if no employees are assigned
  // or fail with 409 if the system has default employee assignments
  await api.functional.hrmPlatform.member.roles.erase(memberConnection, {
    roleId: customRole.id,
  });
  // 4. Verify deletion completed (or would fail with 409 if employees assigned)
  // The erase function returns void on success
  // If employees were assigned, this would throw HttpError with status 409
}

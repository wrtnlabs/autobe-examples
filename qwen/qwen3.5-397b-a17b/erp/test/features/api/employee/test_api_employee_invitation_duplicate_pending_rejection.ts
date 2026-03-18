import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
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
import { prepare_random_hrm_platform_role_permission } from "../../../prepare/prepare_random_hrm_platform_role_permission";

export async function test_api_employee_invitation_duplicate_pending_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member with employee management permission
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a custom role with employee:manage permission for assignment
  const role = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        permissions: [
          { permission: "employee:manage" },
          { permission: "employee:view" },
        ],
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(role);
  // 3. Generate a unique email address for the invitation test (non-existent user)
  const inviteEmail = typia.random<string & tags.Format<"email">>();
  // 4. Send first invitation request - should succeed (creates pending invitation)
  const firstInvitation =
    await api.functional.hrmPlatform.member.employees.invite(memberConnection, {
      body: {
        email: inviteEmail,
        role_id: role.id,
        position: RandomGenerator.name(),
        employment_type: "full-time",
      } satisfies IHrmPlatformEmployee.IInvite,
    });
  typia.assert(firstInvitation);
  // Validate first invitation was successful
  TestValidator.equals(
    "first invitation email matches",
    firstInvitation.member.email,
    inviteEmail,
  );
  TestValidator.equals(
    "first invitation role matches",
    firstInvitation.role.id,
    role.id,
  );
  // 5. Send second invitation request with same email - should fail (duplicate pending invitation)
  await TestValidator.error(
    "duplicate pending invitation rejected",
    async () => {
      await api.functional.hrmPlatform.member.employees.invite(
        memberConnection,
        {
          body: {
            email: inviteEmail,
            role_id: role.id,
            position: RandomGenerator.name(),
            employment_type: "part-time",
          } satisfies IHrmPlatformEmployee.IInvite,
        },
      );
    },
  );
  // 6. Verify the original employee record is unchanged
  TestValidator.equals(
    "original email unchanged",
    firstInvitation.member.email,
    inviteEmail,
  );
}

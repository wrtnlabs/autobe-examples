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

export async function test_api_employee_invitation_new_user_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account (inviter) with authorization
  const inviterConnection: api.IConnection = { host: connection.host };
  const inviter = await authorize_member_join(inviterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(inviter);
  // 2. Create a custom role with employee:manage permission for the inviter's organization
  const role = await generate_random_hrm_platform_member_roles_create(
    inviterConnection,
    {
      body: {
        name: RandomGenerator.name(),
        permissions: [
          {
            permission: "employee:manage",
          } satisfies IHrmPlatformRolePermission.ICreate,
        ],
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(role);
  // 3. Generate a unique email address for the new user (no existing account)
  // Using different random generation to ensure it differs from inviter email
  const newEmployeeEmail = `newemployee_${RandomGenerator.alphaNumeric(8)}@${RandomGenerator.alphabets(8)}.com`;
  // 4. Send invitation to the new email address
  const invitation = await api.functional.hrmPlatform.member.employees.invite(
    inviterConnection,
    {
      body: {
        email: newEmployeeEmail,
        role_id: role.id,
        position: RandomGenerator.name(),
        employment_type: "full-time",
      } satisfies IHrmPlatformEmployee.IInvite,
    },
  );
  typia.assert(invitation);
  // 5. Validate invitation response - business logic validation only
  TestValidator.equals(
    "invitation email matches input",
    invitation.member.email,
    newEmployeeEmail,
  );
  TestValidator.equals(
    "invitation role matches assigned role",
    invitation.role.id,
    role.id,
  );
  TestValidator.equals(
    "employment type matches input",
    invitation.employment_type,
    "full-time",
  );
  TestValidator.predicate(
    "employee status is active",
    invitation.status === "active",
  );
  TestValidator.predicate(
    "position matches input",
    invitation.position === RandomGenerator.name(),
  );
}

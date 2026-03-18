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

/**
 * Test employee invitation when inviting an existing member account.
 * Verifies that inviting a user with an existing account creates an immediate
 * employee record rather than a pending invitation.
 */
export async function test_api_employee_invitation_existing_user_immediate(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create inviter member account
  const inviterConnection: api.IConnection = { host: connection.host };
  const inviterAuth = await authorize_member_join(inviterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(inviterAuth);
  // Step 2: Create invitee member account (existing user to be invited)
  const inviteeEmail = typia.random<string & tags.Format<"email">>();
  const inviteeConnection: api.IConnection = { host: connection.host };
  const inviteeAuth = await authorize_member_join(inviteeConnection, {
    body: {
      email: inviteeEmail,
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(inviteeAuth);
  // Step 3: Create a custom role with employee:manage permission for the inviter
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
  // Step 4: Invite the existing member using their email
  const invitationBody = {
    email: inviteeEmail,
    role_id: role.id,
    position: RandomGenerator.name(),
    employment_type: "full-time",
  } satisfies IHrmPlatformEmployee.IInvite;
  const employee: IHrmPlatformEmployee =
    await api.functional.hrmPlatform.member.employees.invite(
      inviterConnection,
      {
        body: invitationBody,
      },
    );
  typia.assert(employee);
  // Step 5: Validate the employee record was created immediately
  TestValidator.equals(
    "employee email matches invitee",
    employee.member.email,
    inviteeEmail,
  );
  TestValidator.equals("employee status is active", employee.status, "active");
  TestValidator.equals(
    "employee role matches assigned role",
    employee.role.id,
    role.id,
  );
  TestValidator.equals(
    "employee position matches input",
    employee.position,
    invitationBody.position,
  );
  TestValidator.equals(
    "employee employment type matches input",
    employee.employment_type,
    invitationBody.employment_type,
  );
  TestValidator.predicate(
    "employee has member relation",
    employee.member !== undefined,
  );
  TestValidator.predicate(
    "employee has organization relation",
    employee.organization !== undefined,
  );
  TestValidator.predicate(
    "employee has role relation",
    employee.role !== undefined,
  );
}

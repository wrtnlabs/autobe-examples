import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";

export async function test_api_project_membership_retrieve_member_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account (includes organization creation, member becomes Owner)
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinResult);
  const employeeId = joinResult.member.id;
  // 2. Create a project within the organization
  const project = await api.functional.hrmPlatform.member.projects.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: `#${RandomGenerator.alphabets(6)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        budget_hours: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<1000>
        >(),
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Create project membership with 'member' role
  const membership =
    await api.functional.hrmPlatform.member.projects.memberships.create(
      memberConnection,
      {
        projectId: project.id,
        body: {
          employee_id: employeeId,
          role: "member",
        } satisfies IHrmPlatformProjectMembership.ICreate,
      },
    );
  typia.assert(membership);
  // 4. Retrieve the membership and validate
  const retrieved =
    await api.functional.hrmPlatform.member.projects.memberships.at(
      memberConnection,
      {
        projectId: project.id,
        membershipId: membership.id,
      },
    );
  typia.assert(retrieved);
  // 5. Validation
  TestValidator.equals("membership id matches", retrieved.id, membership.id);
  TestValidator.equals("role is member", retrieved.role, "member");
  TestValidator.equals(
    "organization_id matches",
    retrieved.organization_id,
    membership.organization_id,
  );
  TestValidator.equals(
    "employee id matches",
    retrieved.employee.id,
    membership.employee.id,
  );
  TestValidator.equals(
    "project id matches",
    retrieved.project.id,
    membership.project.id,
  );
  TestValidator.predicate(
    "employee_code is present",
    retrieved.employee.employee_code.length > 0,
  );
  TestValidator.predicate(
    "display_name is present",
    retrieved.employee.display_name !== undefined,
  );
  TestValidator.predicate(
    "email is present and valid",
    retrieved.employee.email.length > 0,
  );
  TestValidator.predicate(
    "project name is present",
    retrieved.project.name.length > 0,
  );
  TestValidator.predicate(
    "project status is present",
    retrieved.project.status.length > 0,
  );
  TestValidator.equals("deleted_at is null", retrieved.deleted_at, null);
  TestValidator.predicate(
    "created_at is valid datetime",
    () => !isNaN(Date.parse(retrieved.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    () => !isNaN(Date.parse(retrieved.updated_at)),
  );
}
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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProjectMembership";
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

export async function test_api_project_membership_list_by_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create project owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: "USD",
      org_description: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(owner);
  // 2. Create project with valid hex color code
  const project = await generate_random_hrm_platform_member_projects_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        color_code: `#${typia.random<string>()
          .replace(/[0-9a-f]/g, () => "0123456789abcdef"[randint(0, 15)])
          .slice(0, 6)}`,
        description: RandomGenerator.paragraph(),
        budget_hours: typia.random<number & tags.Type<"uint32">>(),
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Create Member A (will be assigned as 'member')
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: "KRW",
      org_description: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberA);
  // 4. Create Member B (will be assigned as 'project_lead')
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: "EUR",
      org_description: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberB);
  // 5. Create Member C (will be assigned as 'member')
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: "USD",
      org_description: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberC);
  // 6. Assign Member A as 'member' role
  const membershipA =
    await api.functional.hrmPlatform.member.projects.memberships.create(
      ownerConnection,
      {
        projectId: project.id,
        body: {
          employee_id: memberA.member.id,
          role: "member",
        } satisfies IHrmPlatformProjectMembership.ICreate,
      },
    );
  typia.assert(membershipA);
  TestValidator.equals("membershipA role", membershipA.role, "member");
  // 7. Assign Member B as 'project_lead' role
  const membershipB =
    await api.functional.hrmPlatform.member.projects.memberships.create(
      ownerConnection,
      {
        projectId: project.id,
        body: {
          employee_id: memberB.member.id,
          role: "project_lead",
        } satisfies IHrmPlatformProjectMembership.ICreate,
      },
    );
  typia.assert(membershipB);
  TestValidator.equals("membershipB role", membershipB.role, "project_lead");
  // 8. Assign Member C as 'member' role
  const membershipC =
    await api.functional.hrmPlatform.member.projects.memberships.create(
      ownerConnection,
      {
        projectId: project.id,
        body: {
          employee_id: memberC.member.id,
          role: "member",
        } satisfies IHrmPlatformProjectMembership.ICreate,
      },
    );
  typia.assert(membershipC);
  TestValidator.equals("membershipC role", membershipC.role, "member");
  // 9. Filter by role='member' - should return Member A and Member C
  const memberFilterConnection: api.IConnection = { host: connection.host };
  const memberFilterResult =
    await api.functional.hrmPlatform.member.projects.memberships.index(
      memberFilterConnection,
      {
        projectId: project.id,
        body: {
          role: "member",
        } satisfies IHrmPlatformProjectMembership.IRequest,
      },
    );
  typia.assert(memberFilterResult);
  // 10. Filter by role='project_lead' - should return only Member B
  const projectLeadFilterConnection: api.IConnection = {
    host: connection.host,
  };
  const projectLeadFilterResult =
    await api.functional.hrmPlatform.member.projects.memberships.index(
      projectLeadFilterConnection,
      {
        projectId: project.id,
        body: {
          role: "project_lead",
        } satisfies IHrmPlatformProjectMembership.IRequest,
      },
    );
  typia.assert(projectLeadFilterResult);
  // 11. Validate 'member' filter results
  TestValidator.equals(
    "member filter count",
    memberFilterResult.pagination.records,
    2,
  );
  TestValidator.equals(
    "member filter data length",
    memberFilterResult.data.length,
    2,
  );
  memberFilterResult.data.forEach((membership) => {
    TestValidator.equals(
      `membership role is member`,
      membership.role,
      "member",
    );
    const employeeId = membership.employee.id;
    const isMemberAOrC =
      employeeId === memberA.member.id || employeeId === memberC.member.id;
    TestValidator.predicate("employee is Member A or C", isMemberAOrC);
  });
  // 12. Validate 'project_lead' filter results
  TestValidator.equals(
    "project_lead filter count",
    projectLeadFilterResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "project_lead filter data length",
    projectLeadFilterResult.data.length,
    1,
  );
  TestValidator.equals(
    "project_lead role is project_lead",
    projectLeadFilterResult.data[0].role,
    "project_lead",
  );
  TestValidator.equals(
    "project_lead is Member B",
    projectLeadFilterResult.data[0].employee.id,
    memberB.member.id,
  );
  // 13. Test empty filter returns all memberships
  const emptyFilterConnection: api.IConnection = { host: connection.host };
  const emptyFilterResult =
    await api.functional.hrmPlatform.member.projects.memberships.index(
      emptyFilterConnection,
      {
        projectId: project.id,
        body: {} satisfies IHrmPlatformProjectMembership.IRequest,
      },
    );
  typia.assert(emptyFilterResult);
  TestValidator.equals(
    "empty filter returns all",
    emptyFilterResult.pagination.records,
    3,
  );
  TestValidator.equals(
    "empty filter data length",
    emptyFilterResult.data.length,
    3,
  );
}

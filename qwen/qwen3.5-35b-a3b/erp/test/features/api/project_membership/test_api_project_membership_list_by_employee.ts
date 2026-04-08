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

export async function test_api_project_membership_list_by_employee(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for authentication
  const authConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_member_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authResponse);
  // 2. Create project using authenticated connection
  const projectConnection: api.IConnection = { host: connection.host };
  projectConnection.headers = { Authorization: authResponse.token.access };
  const project = await generate_random_hrm_platform_member_projects_create(
    projectConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: `#${RandomGenerator.alphaNumeric(6)}`,
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Create 3 memberships by creating members and assigning to project
  // Each member creates their own organization, so we'll test filtering with 3 separate memberships
  const memberConnections: api.IConnection[] = [];
  const memberResponses: IHrmPlatformMember.IAuthorized[] = [];
  const employeeIds: string[] = [];
  for (let i = 0; i < 3; i++) {
    // Create new member account
    const memberAuthConnection: api.IConnection = { host: connection.host };
    const memberResponse = await authorize_member_join(memberAuthConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
        org_name: RandomGenerator.name(),
        org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmPlatformMember.IJoin,
    });
    typia.assert(memberResponse);
    memberResponses.push(memberResponse);
    employeeIds.push(memberResponse.member.id);
    memberConnections.push(memberAuthConnection);
    // Assign this member to the project
    const membershipConnection: api.IConnection = { host: connection.host };
    membershipConnection.headers = {
      Authorization: memberResponse.token.access,
    };
    const membership =
      await api.functional.hrmPlatform.member.projects.memberships.create(
        membershipConnection,
        {
          projectId: project.id,
          body: {
            employee_id: memberResponse.member.id,
            role: i === 0 ? "project_lead" : "member",
          } satisfies IHrmPlatformProjectMembership.ICreate,
        },
      );
    typia.assert(membership);
  }
  // 4. Test filtering by Employee A's ID (using same connection that owns the project)
  const filterConnection: api.IConnection = { host: connection.host };
  filterConnection.headers = { Authorization: authResponse.token.access };
  const filteredByEmployeeA =
    await api.functional.hrmPlatform.member.projects.memberships.index(
      filterConnection,
      {
        projectId: project.id,
        body: {
          employeeId: employeeIds[0],
        } satisfies IHrmPlatformProjectMembership.IRequest,
      },
    );
  typia.assert(filteredByEmployeeA);
  TestValidator.equals(
    "filtered by employee A returns exactly 1 membership",
    filteredByEmployeeA.data.length,
    1,
  );
  TestValidator.equals(
    "filtered membership matches employee A ID",
    filteredByEmployeeA.data[0].employee.id,
    employeeIds[0],
  );
  // 5. Test filtering by Employee B's ID
  const filteredByEmployeeB =
    await api.functional.hrmPlatform.member.projects.memberships.index(
      filterConnection,
      {
        projectId: project.id,
        body: {
          employeeId: employeeIds[1],
        } satisfies IHrmPlatformProjectMembership.IRequest,
      },
    );
  typia.assert(filteredByEmployeeB);
  TestValidator.equals(
    "filtered by employee B returns exactly 1 membership",
    filteredByEmployeeB.data.length,
    1,
  );
  TestValidator.equals(
    "filtered membership matches employee B ID",
    filteredByEmployeeB.data[0].employee.id,
    employeeIds[1],
  );
  // 6. Test filtering without employeeId (should return all 3 memberships)
  const allMemberships =
    await api.functional.hrmPlatform.member.projects.memberships.index(
      filterConnection,
      {
        projectId: project.id,
        body: {} satisfies IHrmPlatformProjectMembership.IRequest,
      },
    );
  typia.assert(allMemberships);
  TestValidator.equals(
    "no filter returns all 3 memberships",
    allMemberships.data.length,
    3,
  );
  // 7. Test filtering by non-existent employee ID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  const filteredByNonExistent =
    await api.functional.hrmPlatform.member.projects.memberships.index(
      filterConnection,
      {
        projectId: project.id,
        body: {
          employeeId: nonExistentId,
        } satisfies IHrmPlatformProjectMembership.IRequest,
      },
    );
  typia.assert(filteredByNonExistent);
  TestValidator.equals(
    "non-existent employee returns empty data array",
    filteredByNonExistent.data.length,
    0,
  );
  TestValidator.equals(
    "pagination shows 0 records for empty result",
    filteredByNonExistent.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0 for empty result",
    filteredByNonExistent.pagination.pages,
    0,
  );
}

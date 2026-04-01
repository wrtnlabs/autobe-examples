import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProjectMembership";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_create";
import { generate_random_erp_hrm_time_member_projects_memberships_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_memberships_create";
import { prepare_random_erp_hrm_time_project } from "../../../prepare/prepare_random_erp_hrm_time_project";
import { prepare_random_erp_hrm_time_project_membership } from "../../../prepare/prepare_random_erp_hrm_time_project_membership";

export async function test_api_project_membership_preserve_other_assignments(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "ChangeMe123!",
      name: RandomGenerator.name(),
      href: "https://example.com/signup",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const projectConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: joined.token.access },
  };
  const projectOne = await generate_random_erp_hrm_time_member_projects_create(
    projectConnection,
    {
      body: {
        name: `project-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: `#${RandomGenerator.alphabets(6)}`,
        status: "active",
        budgetHours: 120,
        startDate: new Date().toISOString(),
        endDate: null,
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(projectOne);
  const projectTwo = await generate_random_erp_hrm_time_member_projects_create(
    projectConnection,
    {
      body: {
        name: `project-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: `#${RandomGenerator.alphabets(6)}`,
        status: "active",
        budgetHours: 80,
        startDate: new Date().toISOString(),
        endDate: null,
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(projectTwo);
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employeeJoin = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: employeeEmail,
        password: "ChangeMe123!",
        name: RandomGenerator.name(),
        href: "https://example.com/signup",
        referrer: "https://example.com/",
      } satisfies IErpHrmTimeMember.IJoin,
    },
  );
  typia.assert(employeeJoin);
  const employeeConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: employeeJoin.token.access },
  };
  const membershipOne =
    await generate_random_erp_hrm_time_member_projects_memberships_create(
      projectConnection,
      {
        params: { projectId: projectOne.id },
        body: {
          employeeId: employeeJoin.id,
          projectRole: "member",
        } satisfies IErpHrmTimeProjectMembership.ICreate,
      },
    );
  typia.assert(membershipOne);
  const membershipTwo =
    await generate_random_erp_hrm_time_member_projects_memberships_create(
      projectConnection,
      {
        params: { projectId: projectTwo.id },
        body: {
          employeeId: employeeJoin.id,
          projectRole: "member",
        } satisfies IErpHrmTimeProjectMembership.ICreate,
      },
    );
  typia.assert(membershipTwo);
  await api.functional.erpHrmTime.member.projects.memberships.erase(
    projectConnection,
    {
      projectId: projectOne.id,
      membershipId: membershipOne.id,
    },
  );
  await api.functional.erpHrmTime.member.projects.memberships.erase(
    projectConnection,
    {
      projectId: projectTwo.id,
      membershipId: membershipTwo.id,
    },
  );
  TestValidator.notEquals(
    "membership ids should be different across project assignments",
    membershipOne.id,
    membershipTwo.id,
  );
  TestValidator.equals(
    "employee connection remains usable after one project membership is removed",
    employeeConnection.headers?.Authorization,
    employeeJoin.token.access,
  );
}

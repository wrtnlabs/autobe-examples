import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProjectMembership";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeProjectMembership";
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

export async function test_api_project_membership_list_after_member_removal(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const project = await generate_random_erp_hrm_time_member_projects_create(
    memberConnection,
    {
      body: {
        name: `Project ${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#3366ff",
        status: "active",
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(project);
  const otherProject =
    await generate_random_erp_hrm_time_member_projects_create(
      memberConnection,
      {
        body: {
          name: `Project ${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          colorCode: "#ff6633",
          status: "active",
        } satisfies IErpHrmTimeProject.ICreate,
      },
    );
  typia.assert(otherProject);
  const membershipRequests = ArrayUtil.repeat(
    3,
    (index) =>
      ({
        erpHrmtimeEmployeeId: typia.random<string & tags.Format<"uuid">>(),
        projectRole: index === 0 ? "project-lead" : "member",
      }) satisfies IErpHrmTimeProjectMembership.ICreate,
  );
  const memberships = await ArrayUtil.asyncMap(
    membershipRequests,
    async (body) => {
      const membership =
        await generate_random_erp_hrm_time_member_projects_memberships_create(
          memberConnection,
          {
            params: { projectId: project.id },
            body,
          },
        );
      typia.assert(membership);
      return membership;
    },
  );
  const otherMembership =
    await generate_random_erp_hrm_time_member_projects_memberships_create(
      memberConnection,
      {
        params: { projectId: otherProject.id },
        body: {
          erpHrmtimeEmployeeId: typia.random<string & tags.Format<"uuid">>(),
          projectRole: "member",
        } satisfies IErpHrmTimeProjectMembership.ICreate,
      },
    );
  typia.assert(otherMembership);
  const before =
    await api.functional.erpHrmTime.member.projects.memberships.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IErpHrmTimeProjectMembership.IRequest,
      },
    );
  typia.assert(before);
  TestValidator.equals(
    "initial membership count",
    before.data.length,
    memberships.length,
  );
  TestValidator.predicate(
    "all initial members are present",
    memberships.every((membership) =>
      before.data.some(
        (item) =>
          item.id === membership.id &&
          item.projectRole === membership.project_role,
      ),
    ),
  );
  await api.functional.erpHrmTime.member.projects.memberships.erase(
    memberConnection,
    {
      projectId: project.id,
      membershipId: memberships[0].id,
    },
  );
  const after =
    await api.functional.erpHrmTime.member.projects.memberships.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IErpHrmTimeProjectMembership.IRequest,
      },
    );
  typia.assert(after);
  TestValidator.equals(
    "membership count after removal",
    after.data.length,
    memberships.length - 1,
  );
  TestValidator.predicate(
    "removed membership is gone",
    !after.data.some((item) => item.id === memberships[0].id),
  );
  TestValidator.predicate(
    "remaining memberships stay intact",
    memberships
      .slice(1)
      .every((membership) =>
        after.data.some(
          (item) =>
            item.id === membership.id &&
            item.projectRole === membership.project_role,
        ),
      ),
  );
  const otherAfter =
    await api.functional.erpHrmTime.member.projects.memberships.index(
      memberConnection,
      {
        projectId: otherProject.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IErpHrmTimeProjectMembership.IRequest,
      },
    );
  typia.assert(otherAfter);
  TestValidator.equals(
    "other project membership remains unchanged",
    otherAfter.data.length,
    1,
  );
  TestValidator.equals(
    "other project membership id stays the same",
    otherAfter.data[0].id,
    otherMembership.id,
  );
}

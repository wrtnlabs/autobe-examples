import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";

export async function test_api_project_detail_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(memberA);
  const organizationA =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberAConnection,
      {
        body: {
          name: `org-a-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscalStartMonth: 1,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organizationA);
  const projectA =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberAConnection,
      {
        body: {
          name: `project-a-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          colorCode: "#3366ff",
          status: "active",
          budgetHours: 40,
        } satisfies IHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(projectA);
  const projectAView = await api.functional.hrmTimeTracking.member.projects.at(
    memberAConnection,
    { projectId: projectA.id },
  );
  typia.assert(projectAView);
  TestValidator.equals("project id matches", projectAView.id, projectA.id);
  TestValidator.equals(
    "project organization matches active tenant",
    projectAView.organization.id,
    organizationA.id,
  );
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(memberB);
  const organizationB =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberBConnection,
      {
        body: {
          name: `org-b-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscalStartMonth: 2,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organizationB);
  const projectB =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberBConnection,
      {
        body: {
          name: `project-b-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          colorCode: "#ff6633",
          status: "active",
          budgetHours: 24,
        } satisfies IHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(projectB);
  await TestValidator.httpError(
    "project detail should not reveal another organization's project",
    [403, 404],
    async () => {
      await api.functional.hrmTimeTracking.member.projects.at(
        memberAConnection,
        {
          projectId: projectB.id,
        },
      );
    },
  );
}

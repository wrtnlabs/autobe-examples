import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMembership";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingProjectMembership";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";

export async function test_api_project_members_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  const sourceConnection: api.IConnection = { host: connection.host };
  const sourceAuth = await authorize_member_join(sourceConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(sourceAuth);
  const sourceProject =
    await generate_random_hrm_time_tracking_member_projects_create(
      sourceConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          colorCode: "#3366ff",
          status: "active",
        } satisfies IHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(sourceProject);
  const foreignConnection: api.IConnection = { host: connection.host };
  const foreignAuth = await authorize_member_join(foreignConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(foreignAuth);
  const foreignProject =
    await generate_random_hrm_time_tracking_member_projects_create(
      foreignConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          colorCode: "#ff6633",
          status: "active",
        } satisfies IHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(foreignProject);
  await TestValidator.error(
    "cross-organization project member browsing should not expose foreign tenant data",
    async () => {
      const foreignMembers =
        await api.functional.hrmTimeTracking.member.projects.members.index(
          sourceConnection,
          {
            projectId: foreignProject.id,
            body: {
              page: 1,
              pageSize: 10,
            } satisfies IHrmTimeTrackingProjectMembership.IRequest,
          },
        );
      typia.assert(foreignMembers);
      const belongsToForeignOrganization = foreignMembers.data.some(
        (membership) =>
          membership.employee.organization.id ===
          foreignProject.organization.id,
      );
      TestValidator.predicate(
        "foreign organization membership data must not be visible through the source organization context",
        !belongsToForeignOrganization,
      );
    },
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import type { IErpHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProjectMembership";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_organizations_create";
import { generate_random_erp_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_projects_create";
import { generate_random_erp_hrm_time_tracking_member_projects_memberships_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_projects_memberships_create";
import { prepare_random_erp_hrm_time_tracking_organization } from "../../../prepare/prepare_random_erp_hrm_time_tracking_organization";
import { prepare_random_erp_hrm_time_tracking_project } from "../../../prepare/prepare_random_erp_hrm_time_tracking_project";
import { prepare_random_erp_hrm_time_tracking_project_membership } from "../../../prepare/prepare_random_erp_hrm_time_tracking_project_membership";

export async function test_api_project_membership_erase_rejects_wrong_project_membership_pair(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password-1234",
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 3,
      href: "https://example.com/join",
      referrer: "https://example.com/ref",
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const projectA =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(projectA);
  const projectB =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(projectB);
  const membershipA =
    await generate_random_erp_hrm_time_tracking_member_projects_memberships_create(
      memberConnection,
      {
        params: { projectId: projectA.id },
      },
    );
  typia.assert(membershipA);
  await TestValidator.error(
    "should reject deleting membership from wrong project",
    async () => {
      await api.functional.erpHrmTimeTracking.member.projects.memberships.erase(
        memberConnection,
        {
          projectId: projectB.id,
          membershipId: membershipA.id,
        },
      );
    },
  );
  const assignedAfterWrongErase =
    await api.functional.erpHrmTimeTracking.member.projects.assigned.index(
      memberConnection,
      {
        body: typia.random<IErpHrmTimeTrackingProjectMembership.IRequest>(),
      },
    );
  typia.assert(assignedAfterWrongErase);
  TestValidator.predicate(
    "project A should still be assigned",
    assignedAfterWrongErase.data.some((p) => p.id === projectA.id),
  );
  TestValidator.notEquals(
    "project B should not be assigned",
    assignedAfterWrongErase.data.some((p) => p.id === projectB.id),
    true,
  );
  await api.functional.erpHrmTimeTracking.member.projects.memberships.erase(
    memberConnection,
    {
      projectId: projectA.id,
      membershipId: membershipA.id,
    },
  );
  const assignedAfterCorrectErase =
    await api.functional.erpHrmTimeTracking.member.projects.assigned.index(
      memberConnection,
      {
        body: typia.random<IErpHrmTimeTrackingProjectMembership.IRequest>(),
      },
    );
  typia.assert(assignedAfterCorrectErase);
  TestValidator.predicate(
    "project A should be removed after correct erase",
    !assignedAfterCorrectErase.data.some((p) => p.id === projectA.id),
  );
}

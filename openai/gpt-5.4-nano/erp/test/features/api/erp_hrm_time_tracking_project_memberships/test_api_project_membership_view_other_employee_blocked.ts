import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import type { IErpHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProjectMembership";
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

export async function test_api_project_membership_view_other_employee_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A joins (creates/owns the initial organization)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAJoin: IErpHrmTimeTrackingMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password-1234!",
    organizationName: `${RandomGenerator.alphabets(10)}-${RandomGenerator.alphabets(6)}`,
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1,
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
    organizationLogoUrl: null,
  };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: memberAJoin,
  });
  typia.assert(memberAAuthorized);
  // Create project within Member A's org context
  const project =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      memberAConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          color: "#1A2B3C",
          status: "active",
        } satisfies IErpHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(project);
  // Assign Member A (as employee) to the project
  const membershipA =
    await generate_random_erp_hrm_time_tracking_member_projects_memberships_create(
      memberAConnection,
      {
        params: { projectId: project.id },
        body: {
          employee_id: memberAAuthorized.id,
          membership_role: "employee",
        } satisfies IErpHrmTimeTrackingProjectMembership.ICreate,
      },
    );
  typia.assert(membershipA);
  // 2) Member B joins with the same organizationName so it shares org context
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBJoin: IErpHrmTimeTrackingMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password-1234!",
    organizationName: memberAJoin.organizationName,
    organizationDescription: memberAJoin.organizationDescription,
    organizationCurrencyCode: memberAJoin.organizationCurrencyCode,
    organizationTimezone: memberAJoin.organizationTimezone,
    organizationFiscalStartMonth: memberAJoin.organizationFiscalStartMonth,
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
    organizationLogoUrl: null,
  };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: memberBJoin,
  });
  typia.assert(memberBAuthorized);
  // 3) Member B must not be able to view Member A's membership detail
  await TestValidator.error(
    "should block member B from viewing member A membership",
    async () => {
      await api.functional.erpHrmTimeTracking.member.projects.memberships.at(
        memberBConnection,
        {
          projectId: project.id,
          membershipId: membershipA.id,
        },
      );
    },
  );
}

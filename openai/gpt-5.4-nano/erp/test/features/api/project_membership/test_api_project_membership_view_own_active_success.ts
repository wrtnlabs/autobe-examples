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

export async function test_api_project_membership_view_own_active_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAPassword = "Password!234";
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const authorizedA = await authorize_member_join(memberAConnection, {
    body: {
      email: memberAEmail,
      password: memberAPassword,
      organizationName: `${RandomGenerator.alphabets(8)}-orgA`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const memberAId = authorizedA.id;
  // 2) Create an organization in the current context
  const organizationA =
    await generate_random_erp_hrm_time_tracking_member_organizations_create(
      memberAConnection,
      {
        body: {
          name: `${RandomGenerator.alphabets(10)}-orgA`,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          logo_url: null,
          currency_code: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
          >(),
        } satisfies IErpHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organizationA);
  // 3) Create a project
  const projectA =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      memberAConnection,
      {
        body: {
          name: `${RandomGenerator.alphabets(12)}-projA`,
          color: "#1A2B3C",
          status: "active",
        } satisfies IErpHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(projectA);
  // 4) Create membership assigning authenticated member
  const membershipRoleA = typia.random<string>();
  const membershipA =
    await generate_random_erp_hrm_time_tracking_member_projects_memberships_create(
      memberAConnection,
      {
        params: { projectId: projectA.id },
        body: {
          employee_id: memberAId,
          membership_role: membershipRoleA,
        } satisfies IErpHrmTimeTrackingProjectMembership.ICreate,
      },
    );
  typia.assert(membershipA);
  // 5) View own membership
  const fetchedMembershipA =
    await api.functional.erpHrmTimeTracking.member.projects.memberships.at(
      memberAConnection,
      {
        projectId: projectA.id,
        membershipId: membershipA.id,
      },
    );
  typia.assert(fetchedMembershipA);
  TestValidator.equals(
    "project_id matches",
    fetchedMembershipA.project_id,
    projectA.id,
  );
  TestValidator.equals(
    "membership id matches",
    fetchedMembershipA.id,
    membershipA.id,
  );
  TestValidator.equals(
    "membership_role matches",
    fetchedMembershipA.membership_role,
    membershipRoleA,
  );
  TestValidator.equals(
    "employee_id matches authenticated member",
    fetchedMembershipA.employee_id,
    memberAId,
  );
  TestValidator.equals(
    "employee summary id matches authenticated member",
    fetchedMembershipA.employee.id,
    memberAId,
  );
  TestValidator.equals(
    "tenant isolation: project organization matches",
    fetchedMembershipA.project.erp_hrm_time_tracking_organization_id,
    organizationA.id,
  );
  // Scenario B: cross-project membership not visible under Project A
  const projectB =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      memberAConnection,
      {
        body: {
          name: `${RandomGenerator.alphabets(12)}-projB`,
          color: "#0B1C2D",
          status: "active",
        } satisfies IErpHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(projectB);
  const membershipRoleB = typia.random<string>();
  const membershipB =
    await generate_random_erp_hrm_time_tracking_member_projects_memberships_create(
      memberAConnection,
      {
        params: { projectId: projectB.id },
        body: {
          employee_id: memberAId,
          membership_role: membershipRoleB,
        } satisfies IErpHrmTimeTrackingProjectMembership.ICreate,
      },
    );
  typia.assert(membershipB);
  await TestValidator.error(
    "cross-project membership should not be readable under Project A",
    async () => {
      await api.functional.erpHrmTimeTracking.member.projects.memberships.at(
        memberAConnection,
        {
          projectId: projectA.id,
          membershipId: membershipB.id,
        },
      );
    },
  );
}

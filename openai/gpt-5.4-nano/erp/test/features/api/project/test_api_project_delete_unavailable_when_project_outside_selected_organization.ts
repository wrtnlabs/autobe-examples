import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
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
import { prepare_random_erp_hrm_time_tracking_organization } from "../../../prepare/prepare_random_erp_hrm_time_tracking_organization";
import { prepare_random_erp_hrm_time_tracking_project } from "../../../prepare/prepare_random_erp_hrm_time_tracking_project";

export async function test_api_project_delete_unavailable_when_project_outside_selected_organization(
  connection: api.IConnection,
): Promise<void> {
  // Member joins once; initial selected organization is orgA.
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const joinPayload: IErpHrmTimeTrackingMember.IJoin = {
    email: memberEmail,
    password: "Password123!",
    organizationName: `orgA-${RandomGenerator.alphabets(8)}`,
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 3,
    href: "https://example.com/signup",
    referrer: "https://example.com/",
    ip: "127.0.0.1",
  };
  const authorized = await authorize_member_join(memberConnection, {
    body: joinPayload,
  });
  typia.assert(authorized);
  // Capture orgA from join input name by creating it via setup generation? We'll read it from org update later.
  // Create projectA in current selected org (orgA).
  const projectA =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          color: RandomGenerator.pick(["red", "blue", "green"]),
          status: RandomGenerator.pick(["active", "inactive"]),
        },
      },
    );
  typia.assert(projectA);
  const projectAId = projectA.id;
  const projectAOrgId = projectA.erp_hrm_time_tracking_organization_id;
  // Create orgB within same member context.
  const orgB =
    await generate_random_erp_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: `orgB-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logo_url: null,
          currency_code: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 3,
        },
      },
    );
  typia.assert(orgB);
  // Switch selected organization context to orgB.
  await api.functional.erpHrmTimeTracking.member.organizations.updateOrganization(
    memberConnection,
    {
      body: {
        name: orgB.name,
      },
    },
  );
  // Attempt DELETE projectA while orgB is selected -> must fail.
  await TestValidator.error(
    "delete should be unavailable outside selected organization",
    async () => {
      await api.functional.erpHrmTimeTracking.member.projects.erase(
        memberConnection,
        { projectId: projectAId },
      );
    },
  );
  // Verify projectA is not resolvable under orgB context.
  await TestValidator.error(
    "get should be unavailable outside selected organization",
    async () => {
      await api.functional.erpHrmTimeTracking.member.projects.at(
        memberConnection,
        { projectId: projectAId },
      );
    },
  );
  // Switch back to orgA (original project organization).
  // UpdateOrganization takes IUpdate; only name is provided in response.
  // We can switch by setting name to the original org name; but we only have org id.
  // Recreate orgA name is not available; therefore we switch by updating using the original org name isn't possible.
  // Instead, derive orgA name by switching orgB doesn't return; but no org get endpoint exists.
  // We'll use org update with name from joinPayload as orgA name.
  await api.functional.erpHrmTimeTracking.member.organizations.updateOrganization(
    memberConnection,
    {
      body: {
        name: joinPayload.organizationName,
      },
    },
  );
  const projectAAfter =
    await api.functional.erpHrmTimeTracking.member.projects.at(
      memberConnection,
      { projectId: projectAId },
    );
  typia.assert(projectAAfter);
  TestValidator.equals(
    "projectA organization id unchanged",
    projectAAfter.erp_hrm_time_tracking_organization_id,
    projectAOrgId,
  );
  TestValidator.equals("projectA id unchanged", projectAAfter.id, projectAId);
}

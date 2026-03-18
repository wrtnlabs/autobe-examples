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

export async function test_api_project_membership_erase_rejects_second_removal_of_same_membership(
  connection: api.IConnection,
): Promise<void> {
  // This test intentionally avoids base `connection` usage.
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody: IErpHrmTimeTrackingMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssword-" + RandomGenerator.alphabets(12),
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "KRW",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth:
      (randint(1, 12) as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<12>),
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
    ip: null,
  };
  const authorized = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  const org = await generate_random_erp_hrm_time_tracking_member_organizations_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        logo_url: null,
        currency_code: "KRW",
        timezone: "Asia/Seoul",
        fiscal_start_month:
          (randint(1, 12) as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<12>),
      },
    },
  );
  typia.assert(org);
  const project = await generate_random_erp_hrm_time_tracking_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        color: "#" + RandomGenerator.alphabets(6),
        status: "active",
      },
    },
  );
  typia.assert(project);
  const membership = await generate_random_erp_hrm_time_tracking_member_projects_memberships_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        employee_id: authorized.id,
        membership_role: "member",
      },
    },
  );
  typia.assert(membership);

  await api.functional.erpHrmTimeTracking.member.projects.memberships.erase(
    memberConnection,
    {
      projectId: project.id,
      membershipId: membership.id,
    },
  );

  await TestValidator.error(
    "rejects second erase of same membership",
    async () => {
      await api.functional.erpHrmTimeTracking.member.projects.memberships.erase(
        memberConnection,
        {
          projectId: project.id,
          membershipId: membership.id,
        },
      );
    },
  );
}

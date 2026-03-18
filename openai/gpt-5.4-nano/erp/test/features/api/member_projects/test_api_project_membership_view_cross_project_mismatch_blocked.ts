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

export async function test_api_project_membership_view_cross_project_mismatch_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member authentication
  const baseConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(baseConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: `P@ss${RandomGenerator.alphabets(10)}`,
      organizationName: `org-${RandomGenerator.alphabets(12)}`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "KRW",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join" as string & tags.Format<"uri">,
      referrer: "https://example.com/ref" as string & tags.Format<"uri">,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(joined);
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers ??= {};
  memberConnection.headers.Authorization = joined.token.access;
  // 2) Create projects (avoid guessing enum-like fields)
  const projectA =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      memberConnection,
      {
        body: {
          name: `Project-A-${RandomGenerator.alphabets(8)}`,
        } satisfies Partial<IErpHrmTimeTrackingProject.ICreate>,
      },
    );
  typia.assert(projectA);
  const projectB =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      memberConnection,
      {
        body: {
          name: `Project-B-${RandomGenerator.alphabets(8)}`,
        } satisfies Partial<IErpHrmTimeTrackingProject.ICreate>,
      },
    );
  typia.assert(projectB);
  // 3) Create memberships for each project for the same member (employee)
  const membershipA =
    await generate_random_erp_hrm_time_tracking_member_projects_memberships_create(
      memberConnection,
      {
        params: { projectId: projectA.id },
        body: {
          employee_id: joined.id,
        } satisfies Partial<IErpHrmTimeTrackingProjectMembership.ICreate>,
      },
    );
  typia.assert(membershipA);
  const membershipB =
    await generate_random_erp_hrm_time_tracking_member_projects_memberships_create(
      memberConnection,
      {
        params: { projectId: projectB.id },
        body: {
          employee_id: joined.id,
        } satisfies Partial<IErpHrmTimeTrackingProjectMembership.ICreate>,
      },
    );
  typia.assert(membershipB);
  // 4) Cross-project mismatch call must be blocked
  await TestValidator.error(
    "blocked cross-project membership access",
    async () => {
      const res =
        await api.functional.erpHrmTimeTracking.member.projects.memberships.at(
          memberConnection,
          {
            projectId: projectA.id,
            membershipId: membershipB.id,
          },
        );
      typia.assert(res);
      TestValidator.notEquals(
        "should not expose membershipB",
        res.id,
        membershipB.id,
      );
    },
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
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
import { generate_random_erp_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_projects_create";
import { generate_random_erp_hrm_time_tracking_member_projects_memberships_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_projects_memberships_create";
import { prepare_random_erp_hrm_time_tracking_project } from "../../../prepare/prepare_random_erp_hrm_time_tracking_project";
import { prepare_random_erp_hrm_time_tracking_project_membership } from "../../../prepare/prepare_random_erp_hrm_time_tracking_project_membership";

export async function test_api_project_memberships_create_duplicate_project_employee_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1) Sign up a new member (join)
  const userConnection: api.IConnection = { host: connection.host };
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "KRW",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
    ip: undefined,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const authorized = await authorize_member_join(userConnection, {
    body: memberCredentials,
  });
  typia.assert(authorized);
  // 2) Create a project within the selected organization
  const project =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          color: "#123456",
        } satisfies DeepPartial<IErpHrmTimeTrackingProject.ICreate>,
      },
    );
  typia.assert(project);
  // 3) Create initial membership to obtain an eligible employee_id
  const firstMembership =
    await generate_random_erp_hrm_time_tracking_member_projects_memberships_create(
      userConnection,
      {
        params: { projectId: project.id },
        body: {
          membership_role: typia.random<string>(),
        } satisfies DeepPartial<IErpHrmTimeTrackingProjectMembership.ICreate>,
      },
    );
  typia.assert(firstMembership);
  // 4) Attempt to create the duplicate membership (business conflict)
  await TestValidator.error(
    "duplicate (project, employee) membership conflict should be rejected",
    async () => {
      await generate_random_erp_hrm_time_tracking_member_projects_memberships_create(
        userConnection,
        {
          params: { projectId: project.id },
          body: {
            employee_id: firstMembership.employee_id,
            membership_role: firstMembership.membership_role,
          } satisfies IErpHrmTimeTrackingProjectMembership.ICreate,
        },
      );
    },
  );
  // 5) Ensure the originally created membership is still active
  TestValidator.equals(
    "original membership remains active",
    firstMembership.deleted_at,
    null,
  );
}

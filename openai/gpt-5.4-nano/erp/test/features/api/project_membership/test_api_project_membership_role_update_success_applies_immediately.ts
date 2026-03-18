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

export async function test_api_project_membership_role_update_success_applies_immediately(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member join / authorization
  const memberConnection: api.IConnection = { host: connection.host };
  const unique = RandomGenerator.alphaNumeric(16);
  await authorize_member_join(memberConnection, {
    body: {
      email: `member_${unique}@example.com` satisfies string &
        tags.Format<"email">,
      password: `Pass_${unique}_1234`,
      organizationName: `org_${unique}`,
      organizationDescription: `org_desc_${unique}`,
      organizationCurrencyCode: "KRW",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 3,
      href: `https://example.com/href_${unique}`,
      referrer: `https://example.com/ref_${unique}`,
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  // 2) Create a project
  const project =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      memberConnection,
      {
        body: {
          name: `project_${unique}`,
          color: "#123456",
          status: "active",
        } satisfies IErpHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(project);
  // 3) Create a membership within that project
  const membership =
    await generate_random_erp_hrm_time_tracking_member_projects_memberships_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          employee_id: typia.random<string & tags.Format<"uuid">>(),
          membership_role: "member",
        } satisfies IErpHrmTimeTrackingProjectMembership.ICreate,
      },
    );
  typia.assert(membership);
  const previousUpdatedAt = membership.updated_at;
  TestValidator.equals(
    "membership is active (deleted_at null)",
    membership.deleted_at,
    null,
  );
  // 4) Update membership role
  const updatedRole = "project-lead";
  const updated =
    await api.functional.erpHrmTimeTracking.member.projects.memberships.update(
      memberConnection,
      {
        projectId: project.id,
        membershipId: membership.id,
        body: {
          membership_role: updatedRole,
        } satisfies IErpHrmTimeTrackingProjectMembership.IUpdate,
      },
    );
  typia.assert(updated);
  // 5) Validate response fields
  TestValidator.equals(
    "membership_role updated",
    updated.membership_role,
    updatedRole,
  );
  TestValidator.equals("deleted_at remains null", updated.deleted_at, null);
  TestValidator.predicate(
    "updated_at refreshed",
    new Date(updated.updated_at).getTime() >
      new Date(previousUpdatedAt).getTime(),
  );
  // 6) Business impact validation via membership object only
  TestValidator.equals(
    "membership stays bound to same project",
    updated.project_id,
    project.id,
  );
  TestValidator.equals(
    "membership stays bound to same employee",
    updated.employee_id,
    membership.employee_id,
  );
}

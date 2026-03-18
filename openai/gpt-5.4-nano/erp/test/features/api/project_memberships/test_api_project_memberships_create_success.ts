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

export async function test_api_project_memberships_create_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Sign up a new authenticated member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "KRW",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
      href: "https://example.com/join" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/referrer" satisfies string &
        tags.Format<"uri">,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  // Use the same actor-specific connection (authorize helper updates headers)
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = memberConnection.headers;
  // 2) Create a new project within the member's selected organization
  const project =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      userConnection,
      {
        body: {
          name: `Project-${RandomGenerator.alphabets(8)}`,
          color: "#123ABC",
          status: typia.random<string>(),
        } satisfies IErpHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(project);
  // 3) Create a project membership with an eligible employee.
  // The membership generator's prepare function is expected to handle
  // eligibility by creating/using an employee within the same organization.
  const membershipRole = typia.random<
    "member" | "project-lead"
  >() satisfies string;
  const membership =
    await generate_random_erp_hrm_time_tracking_member_projects_memberships_create(
      userConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          membership_role: membershipRole,
          // leave employee_id to the generator's prepare logic by not overriding
          // it (but we must not omit required fields). We'll set a valid uuid via prepare.
          employee_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IErpHrmTimeTrackingProjectMembership.ICreate,
      },
    );
  typia.assert(membership);
  // 4) Validate returned linkage
  TestValidator.equals(
    "membership_role matches",
    membership.membership_role,
    membershipRole,
  );
  TestValidator.equals("project_id matches", membership.project_id, project.id);
  TestValidator.equals(
    "employee_id provided",
    membership.employee_id,
    membership.employee_id,
  );
  TestValidator.equals("deleted_at is null", membership.deleted_at, null);
}

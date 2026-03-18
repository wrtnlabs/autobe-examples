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

export async function test_api_project_memberships_create_multiple_projects_no_false_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1) member join to obtain authenticated context
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput: IErpHrmTimeTrackingMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: `P@ss-${RandomGenerator.alphabets(12)}-1!`,
    organizationName: RandomGenerator.name(2),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 4,
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  // Create an actor-scoped connection for authenticated API calls.
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers ??= {};
  userConnection.headers.Authorization = authorized.token.access;
  // 2) Create two projects within the same organization context
  const [projectA, projectB] = await Promise.all([
    generate_random_erp_hrm_time_tracking_member_projects_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          color: "#00AAFF",
          status: "active",
        } satisfies IErpHrmTimeTrackingProject.ICreate,
      },
    ),
    generate_random_erp_hrm_time_tracking_member_projects_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          color: "#FF00AA",
          status: "active",
        } satisfies IErpHrmTimeTrackingProject.ICreate,
      },
    ),
  ]);
  typia.assert(projectA);
  typia.assert(projectB);
  // 3) Create membership to projectA for the same employee
  const membershipA =
    await generate_random_erp_hrm_time_tracking_member_projects_memberships_create(
      userConnection,
      {
        params: { projectId: projectA.id },
        body: {
          employee_id: authorized.id,
          membership_role: "member",
        } satisfies IErpHrmTimeTrackingProjectMembership.ICreate,
      },
    );
  typia.assert(membershipA);
  // 4) Create membership to projectB for the same employee
  const membershipB =
    await generate_random_erp_hrm_time_tracking_member_projects_memberships_create(
      userConnection,
      {
        params: { projectId: projectB.id },
        body: {
          employee_id: authorized.id,
          membership_role: "member",
        } satisfies IErpHrmTimeTrackingProjectMembership.ICreate,
      },
    );
  typia.assert(membershipB);
  // 5) Validate: no false duplicate conflict when projectId differs
  TestValidator.equals("membershipA active", membershipA.deleted_at, null);
  TestValidator.equals("membershipB active", membershipB.deleted_at, null);
  TestValidator.equals(
    "membershipA project_id",
    membershipA.project_id,
    projectA.id,
  );
  TestValidator.equals(
    "membershipB project_id",
    membershipB.project_id,
    projectB.id,
  );
  TestValidator.equals(
    "employee_id matches",
    membershipA.employee_id,
    membershipB.employee_id,
  );
  TestValidator.equals(
    "employee_id equals authorized",
    membershipA.employee_id,
    authorized.id,
  );
}

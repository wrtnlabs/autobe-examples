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
import { prepare_random_erp_hrm_time_tracking_project } from "../../../prepare/prepare_random_erp_hrm_time_tracking_project";

export async function test_api_project_memberships_remove_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register a new member account.
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "KRW",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1,
    href: "https://example.com/join",
    referrer: "https://example.com/ref",
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  // Ensure we use actor-specific connection that already has auth headers.
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = {
    Authorization: authorized.token.access,
  };
  // 2) Create a new project in the currently selected organization.
  const project =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.name(),
          color: "#123456",
          status: "active",
        } satisfies IErpHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(project);
  const projectId = project.id;
  // 3) Assign an employee to the project (create active membership).
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  // IRequest is typed as `any | any`, so we rely on server behavior.
  // Still, keep the intent consistent by using a minimal plausible payload.
  const addBody = {
    add: [
      {
        employee_id: employeeId,
        membership_role: "employee",
      },
    ],
    remove: [],
  } satisfies IErpHrmTimeTrackingProjectMembership.IRequest;
  const first =
    await api.functional.erpHrmTimeTracking.member.projects.memberships.updateMemberships(
      userConnection,
      {
        projectId,
        body: addBody,
      },
    );
  typia.assert(first);
  const membershipId = first.id;
  TestValidator.equals("project id matches", first.project_id, projectId);
  TestValidator.equals("employee id matches", first.employee_id, employeeId);
  TestValidator.equals("membership initially active", first.deleted_at, null);
  const updatedAt1 = first.updated_at;
  // 5) Remove the membership (soft-delete).
  const removeBody = {
    add: [],
    remove: [
      {
        employee_id: employeeId,
      },
    ],
  } satisfies IErpHrmTimeTrackingProjectMembership.IRequest;
  const second =
    await api.functional.erpHrmTimeTracking.member.projects.memberships.updateMemberships(
      userConnection,
      {
        projectId,
        body: removeBody,
      },
    );
  typia.assert(second);
  TestValidator.equals("membership id same", second.id, membershipId);
  TestValidator.equals("project id same", second.project_id, projectId);
  TestValidator.equals("employee id same", second.employee_id, employeeId);
  TestValidator.predicate(
    "deleted_at becomes non-null",
    second.deleted_at !== null,
  );
  TestValidator.predicate(
    "updated_at advanced",
    second.updated_at > updatedAt1,
  );
  // 7-8) Removing again should be rejected and state should remain removed.
  await TestValidator.error("repeat removal should fail", async () => {
    await api.functional.erpHrmTimeTracking.member.projects.memberships.updateMemberships(
      userConnection,
      {
        projectId,
        body: removeBody,
      },
    );
  });
  // Attempt a third time; it should also fail, indicating the membership
  // is still not active.
  await TestValidator.error("third removal should fail too", async () => {
    await api.functional.erpHrmTimeTracking.member.projects.memberships.updateMemberships(
      userConnection,
      {
        projectId,
        body: removeBody,
      },
    );
  });
}

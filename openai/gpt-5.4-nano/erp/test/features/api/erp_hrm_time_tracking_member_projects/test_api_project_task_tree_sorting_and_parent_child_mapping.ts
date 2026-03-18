import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import type { IErpHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProjectMembership";
import type { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
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

export async function test_api_project_task_tree_sorting_and_parent_child_mapping(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password!1234",
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "KRW",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
      href: "https://example.com/join",
      referrer: "https://example.com/ref",
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers = { Authorization: member.token.access };
  const project =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      authConnection,
      {
        body: {
          name: `task-tree-${RandomGenerator.alphabets(8)}`,
          color: "#123456",
          status: "active",
        },
      },
    );
  typia.assert(project);
  await generate_random_erp_hrm_time_tracking_member_projects_memberships_create(
    authConnection,
    {
      params: { projectId: project.id },
      body: {
        employee_id: member.id,
        membership_role: "member",
      },
    },
  );
  // The provided SDK/types for taskTree.buildTaskTree return a single
  // IErpHrmTimeTrackingTask, not a tree container. Therefore we validate
  // scoping, soft-delete exclusion, and that parentTask/null semantics
  // align with the requested parentTaskId filter.
  const statusFilter: string = "open";
  const taskAsc =
    await api.functional.erpHrmTimeTracking.member.projects.taskTree.buildTaskTree(
      authConnection,
      {
        projectId: project.id,
        body: {
          sortBy: "created_at",
          sortOrder: "asc",
          status: statusFilter,
          parentTaskId: null,
          limit: 10,
        } satisfies IErpHrmTimeTrackingTask.IRequest,
      },
    );
  typia.assert(taskAsc);
  TestValidator.equals("scoped project id", taskAsc.project.id, project.id);
  TestValidator.equals("soft-deleted excluded", taskAsc.deletedAt, null);
  TestValidator.equals("root filter applied", taskAsc.parentTask, null);
  const taskDesc =
    await api.functional.erpHrmTimeTracking.member.projects.taskTree.buildTaskTree(
      authConnection,
      {
        projectId: project.id,
        body: {
          sortBy: "created_at",
          sortOrder: "desc",
          status: statusFilter,
          parentTaskId: null,
          limit: 10,
        } satisfies IErpHrmTimeTrackingTask.IRequest,
      },
    );
  typia.assert(taskDesc);
  TestValidator.equals(
    "scoped project id (desc)",
    taskDesc.project.id,
    project.id,
  );
  TestValidator.equals(
    "soft-deleted excluded (desc)",
    taskDesc.deletedAt,
    null,
  );
  TestValidator.equals("root filter applied (desc)", taskDesc.parentTask, null);
}

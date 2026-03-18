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
import { generate_random_erp_hrm_time_tracking_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_projects_tasks_create";
import { prepare_random_erp_hrm_time_tracking_project } from "../../../prepare/prepare_random_erp_hrm_time_tracking_project";
import { prepare_random_erp_hrm_time_tracking_task } from "../../../prepare/prepare_random_erp_hrm_time_tracking_task";

export async function test_api_task_detail_no_leak_when_project_inaccessible(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email =
    "member-" + RandomGenerator.alphabets(12).toLowerCase() + "@example.com";
  const password = "Pass-" + RandomGenerator.alphabets(16);
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      organizationName: "org-" + RandomGenerator.alphabets(12).toLowerCase(),
      organizationDescription:
        "org-desc-" + RandomGenerator.alphabets(12).toLowerCase(),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join",
      referrer: "https://example.com/ref",
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers ??= {};
  authConnection.headers.Authorization = authorized.token.access;
  const projectA =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      authConnection,
      {
        body: {
          name: "ProjectA-" + RandomGenerator.alphabets(10).toLowerCase(),
          color: "#" + RandomGenerator.alphabets(6).toLowerCase(),
          status: "active",
        },
      },
    );
  typia.assert(projectA);
  const projectB =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      authConnection,
      {
        body: {
          name: "ProjectB-" + RandomGenerator.alphabets(10).toLowerCase(),
          color: "#" + RandomGenerator.alphabets(6).toLowerCase(),
          status: "active",
        },
      },
    );
  typia.assert(projectB);
  const taskTitle = "TaskTitle-" + RandomGenerator.alphabets(10);
  const taskDescription =
    "TaskDesc-" + RandomGenerator.paragraph({ sentences: 2 });
  const taskB =
    await generate_random_erp_hrm_time_tracking_member_projects_tasks_create(
      authConnection,
      {
        params: { projectId: projectB.id },
        body: {
          title: taskTitle,
          description: taskDescription,
          status: "open",
          priority: "normal",
          estimated_hours: 1,
          due_date: new Date().toISOString(),
          assigned_employee_id: null,
          parent_task_id: null,
        } satisfies IErpHrmTimeTrackingTask.ICreate,
      },
    );
  typia.assert(taskB);
  const membership =
    await api.functional.erpHrmTimeTracking.member.projects.memberships.updateMemberships(
      authConnection,
      {
        projectId: projectB.id,
        body: {
          add: [
            {
              employee_id: authorized.id,
              membership_role: "member",
            },
          ],
          remove: [],
        } satisfies IErpHrmTimeTrackingProjectMembership.IRequest,
      },
    );
  typia.assert(membership);
  await api.functional.erpHrmTimeTracking.member.projects.memberships.erase(
    authConnection,
    {
      projectId: projectB.id,
      membershipId: membership.id,
    },
  );

  type HttpLikeError = { status: number; message: string };

  const invalidAccess = async (props: {
    projectId: string & tags.Format<"uuid">;
    taskId: string & tags.Format<"uuid">;
    title: string;
    description: string;
  }): Promise<void> => {
    let thrown: unknown;
    try {
      await api.functional.erpHrmTimeTracking.member.projects.tasks.at(
        authConnection,
        {
          projectId: props.projectId,
          taskId: props.taskId,
        },
      );
    } catch (e) {
      thrown = e;
    }

    if (thrown === undefined) throw new Error("Expected HttpError");

    const err = typia.assert<HttpLikeError>(thrown);

    TestValidator.predicate(
      "error status is not found-like",
      [401, 403, 404].includes(err.status),
    );
    TestValidator.predicate(
      "error message must not leak task title",
      !err.message.includes(props.title),
    );
    TestValidator.predicate(
      "error message must not leak task description",
      !err.message.includes(props.description),
    );
  };

  await invalidAccess({
    projectId: projectA.id,
    taskId: taskB.id,
    title: taskTitle,
    description: taskDescription,
  });
  await invalidAccess({
    projectId: projectB.id,
    taskId: taskB.id,
    title: taskTitle,
    description: taskDescription,
  });
}

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTimerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimerSession";
import { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingTimerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimerSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingMemberMeTimerSession(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingTimerSession.IRequest;
}): Promise<IPageIHrmTimeTrackingTimerSession> {
  const page: number =
    props.body.page === null || props.body.page === undefined
      ? 1
      : props.body.page;
  const limit: number =
    props.body.limit === null || props.body.limit === undefined
      ? 100
      : props.body.limit;
  const employee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findFirstOrThrow({
      where: {
        user_account_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  const timer =
    await MyGlobal.prisma.hrm_time_tracking_timer_sessions.findUnique({
      where: {
        hrm_time_tracking_employee_id: employee.id,
      },
      select: {
        id: true,
        hrm_time_tracking_employee_id: true,
        hrm_time_tracking_project_id: true,
        hrm_time_tracking_task_id: true,
        started_at: true,
        description: true,
        ended_at: true,
        discarded_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (timer === null) {
    return {
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }
  return {
    pagination: {
      current: page,
      limit: limit,
      records: 1,
      pages: 1,
    },
    data: [
      {
        id: timer.id,
        employee: {
          id: employee.id,
          organization: {} as IHrmTimeTrackingOrganization.ISummary,
          userAccount: {} as IHrmTimeTrackingUserAccount.ISummary,
          role: {} as IHrmTimeTrackingRole.ISummary,
          department: null,
          positionTitle: null,
          employmentType: "",
          status: "",
          createdAt: timer.created_at.toISOString(),
          updatedAt: timer.updated_at.toISOString(),
          deletedAt:
            timer.deleted_at === null ? null : timer.deleted_at.toISOString(),
        } satisfies IHrmTimeTrackingEmployee.ISummary,
        project: {
          id: timer.hrm_time_tracking_project_id,
          organization: {} as IHrmTimeTrackingOrganization.ISummary,
          name: "",
          description: null,
          colorCode: "",
          status: "",
          budgetHours: null,
          startDate: null,
          endDate: null,
          createdAt: timer.created_at.toISOString(),
          updatedAt: timer.updated_at.toISOString(),
          deletedAt:
            timer.deleted_at === null ? null : timer.deleted_at.toISOString(),
        } satisfies IHrmTimeTrackingProject.ISummary,
        task:
          timer.hrm_time_tracking_task_id === null
            ? null
            : ({
                id: timer.hrm_time_tracking_task_id,
                project: {
                  id: timer.hrm_time_tracking_project_id,
                  organization: {} as IHrmTimeTrackingOrganization.ISummary,
                  name: "",
                  description: null,
                  colorCode: "",
                  status: "",
                  budgetHours: null,
                  startDate: null,
                  endDate: null,
                  createdAt: timer.created_at.toISOString(),
                  updatedAt: timer.updated_at.toISOString(),
                  deletedAt:
                    timer.deleted_at === null
                      ? null
                      : timer.deleted_at.toISOString(),
                } satisfies IHrmTimeTrackingProject.ISummary,
                assignee: null,
                parent: null,
                title: "",
                description: null,
                status: "",
                priority: "",
                estimated_hours: null,
                due_date: null,
                created_at: timer.created_at.toISOString(),
                updated_at: timer.updated_at.toISOString(),
                deleted_at:
                  timer.deleted_at === null
                    ? null
                    : timer.deleted_at.toISOString(),
              } satisfies IHrmTimeTrackingTask.ISummary),
        started_at: timer.started_at.toISOString(),
        description: timer.description,
        ended_at: timer.ended_at === null ? null : timer.ended_at.toISOString(),
        discarded_at:
          timer.discarded_at === null ? null : timer.discarded_at.toISOString(),
        created_at: timer.created_at.toISOString(),
        updated_at: timer.updated_at.toISOString(),
        deleted_at:
          timer.deleted_at === null ? null : timer.deleted_at.toISOString(),
      } satisfies IHrmTimeTrackingTimerSession,
    ],
  } satisfies IPageIHrmTimeTrackingTimerSession;
}

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

export async function patchHrmTimeTrackingMemberTimerSessions(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingTimerSession.IRequest;
}): Promise<IPageIHrmTimeTrackingTimerSession> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const employee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findFirstOrThrow({
      where: {
        user_account_id: props.member.id,
        deleted_at: null,
        status: "active",
      },
      select: {
        id: true,
        organization_id: true,
        deleted_at: true,
        status: true,
      },
    });
  const activeSession =
    await MyGlobal.prisma.hrm_time_tracking_timer_sessions.findFirst({
      where: {
        hrm_time_tracking_employee_id: employee.id,
        ended_at: null,
        discarded_at: null,
        deleted_at: null,
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
  const action: "start" | "update" | "stop" | "discard" =
    props.body.action ?? (activeSession === null ? "start" : "update");
  const assertProjectAndTask = async (
    projectId: string,
    taskId: string | null | undefined,
  ): Promise<void> => {
    await MyGlobal.prisma.hrm_time_tracking_projects.findFirstOrThrow({
      where: {
        id: projectId,
        organization_id: employee.organization_id,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (taskId === null || taskId === undefined) return;
    const task = await MyGlobal.prisma.hrm_time_tracking_tasks.findFirst({
      where: { id: taskId, deleted_at: null },
      select: { id: true, hrm_time_tracking_project_id: true },
    });
    if (task === null || task.hrm_time_tracking_project_id !== projectId) {
      throw new HttpException("Task must belong to the selected project", 400);
    }
  };
  const toPage = async (
    sessionId: string,
  ): Promise<IPageIHrmTimeTrackingTimerSession> => {
    const session =
      await MyGlobal.prisma.hrm_time_tracking_timer_sessions.findUniqueOrThrow({
        where: { id: sessionId },
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
    return {
      pagination: {
        current: page,
        limit,
        records: 1,
        pages: 1,
      } satisfies IPage.IPagination,
      data: [
        {
          id: session.id,
          employee: {
            id: employee.id,
            organization: {} as never,
            userAccount: {} as never,
            role: {} as never,
            department: null,
            positionTitle: null,
            employmentType: "",
            status: employee.status,
            createdAt: toISOStringSafe(session.created_at),
            updatedAt: toISOStringSafe(session.updated_at),
            deletedAt:
              session.deleted_at === null
                ? null
                : toISOStringSafe(session.deleted_at),
          } satisfies IHrmTimeTrackingEmployee.ISummary,
          project: {
            id: session.hrm_time_tracking_project_id,
            organization: {} as never,
            name: "",
            description: null,
            colorCode: "",
            status: "",
            budgetHours: null,
            startDate: null,
            endDate: null,
            createdAt: toISOStringSafe(session.created_at),
            updatedAt: toISOStringSafe(session.updated_at),
            deletedAt:
              session.deleted_at === null
                ? null
                : toISOStringSafe(session.deleted_at),
          } satisfies IHrmTimeTrackingProject.ISummary,
          task:
            session.hrm_time_tracking_task_id === null
              ? null
              : ({
                  id: session.hrm_time_tracking_task_id,
                  project: {
                    id: session.hrm_time_tracking_project_id,
                    organization: {} as never,
                    name: "",
                    description: null,
                    colorCode: "",
                    status: "",
                    budgetHours: null,
                    startDate: null,
                    endDate: null,
                    createdAt: toISOStringSafe(session.created_at),
                    updatedAt: toISOStringSafe(session.updated_at),
                    deletedAt:
                      session.deleted_at === null
                        ? null
                        : toISOStringSafe(session.deleted_at),
                  } satisfies IHrmTimeTrackingProject.ISummary,
                  assignee: null,
                  parent: null,
                  title: "",
                  description: null,
                  status: "",
                  priority: "",
                  estimated_hours: null,
                  due_date: null,
                  created_at: toISOStringSafe(session.created_at),
                  updated_at: toISOStringSafe(session.updated_at),
                  deleted_at:
                    session.deleted_at === null
                      ? null
                      : toISOStringSafe(session.deleted_at),
                } satisfies IHrmTimeTrackingTask.ISummary),
          started_at: toISOStringSafe(session.started_at),
          description: session.description,
          ended_at:
            session.ended_at === null
              ? null
              : toISOStringSafe(session.ended_at),
          discarded_at:
            session.discarded_at === null
              ? null
              : toISOStringSafe(session.discarded_at),
          created_at: toISOStringSafe(session.created_at),
          updated_at: toISOStringSafe(session.updated_at),
          deleted_at:
            session.deleted_at === null
              ? null
              : toISOStringSafe(session.deleted_at),
        } satisfies IHrmTimeTrackingTimerSession,
      ],
    };
  };
  if (action === "start") {
    if (activeSession !== null) throw new HttpException("Conflict", 409);
    if (props.body.project_id === undefined)
      throw new HttpException("Project is required", 400);
    await assertProjectAndTask(props.body.project_id, props.body.task_id);
    const created =
      await MyGlobal.prisma.hrm_time_tracking_timer_sessions.create({
        data: {
          id: v4(),
          hrm_time_tracking_employee_id: employee.id,
          hrm_time_tracking_project_id: props.body.project_id,
          hrm_time_tracking_task_id: props.body.task_id ?? null,
          started_at: new Date(),
          description: props.body.description ?? null,
          ended_at: null,
          discarded_at: null,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
        select: { id: true },
      });
    return await toPage(created.id);
  }
  if (action === "update") {
    if (activeSession === null) throw new HttpException("Not Found", 404);
    const projectId =
      props.body.project_id ?? activeSession.hrm_time_tracking_project_id;
    const taskId =
      props.body.task_id === undefined
        ? activeSession.hrm_time_tracking_task_id
        : props.body.task_id;
    await assertProjectAndTask(projectId, taskId);
    await MyGlobal.prisma.hrm_time_tracking_timer_sessions.update({
      where: { id: activeSession.id },
      data: {
        hrm_time_tracking_project_id: projectId,
        hrm_time_tracking_task_id: taskId,
        description:
          props.body.description === undefined
            ? activeSession.description
            : props.body.description,
        updated_at: new Date(),
      },
    });
    return await toPage(activeSession.id);
  }
  if (action === "stop") {
    if (activeSession === null) throw new HttpException("Not Found", 404);
    const stoppedDate = new Date();
    const durationMinutes = Math.max(
      0,
      Math.floor(
        (stoppedDate.getTime() - activeSession.started_at.getTime()) / 60000,
      ),
    );
    await MyGlobal.prisma.$transaction([
      MyGlobal.prisma.hrm_time_tracking_timelogs.create({
        data: {
          id: v4(),
          organization_id: employee.organization_id,
          employee_id: employee.id,
          project_id: activeSession.hrm_time_tracking_project_id,
          task_id: activeSession.hrm_time_tracking_task_id,
          work_date: stoppedDate,
          duration_minutes: durationMinutes,
          description: activeSession.description,
          billable: true,
          created_at: stoppedDate,
          updated_at: stoppedDate,
          deleted_at: null,
        },
      }),
      MyGlobal.prisma.hrm_time_tracking_timer_sessions.update({
        where: { id: activeSession.id },
        data: { ended_at: stoppedDate, updated_at: stoppedDate },
      }),
    ]);
    return await toPage(activeSession.id);
  }
  if (action === "discard") {
    if (activeSession === null) throw new HttpException("Not Found", 404);
    const discardedDate = new Date();
    await MyGlobal.prisma.$transaction([
      MyGlobal.prisma.hrm_time_tracking_timer_sessions.update({
        where: { id: activeSession.id },
        data: { discarded_at: discardedDate, updated_at: discardedDate },
      }),
    ]);
    return await toPage(activeSession.id);
  }
  throw new HttpException("Invalid action", 400);
}

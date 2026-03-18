import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTimerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimerSession";
import { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingTimerSessionTransformer } from "../transformers/HrmTimeTrackingTimerSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTimeTrackingMemberTimerSessionsTimerSessionId(props: {
  member: MemberPayload;
  timerSessionId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingTimerSession.IUpdate;
}): Promise<IHrmTimeTrackingTimerSession> {
  const result = await MyGlobal.prisma.$transaction(async (prisma) => {
    const timerSession =
      await prisma.hrm_time_tracking_timer_sessions.findUniqueOrThrow({
        where: {
          id: props.timerSessionId,
        },
        select: {
          id: true,
          hrm_time_tracking_employee_id: true,
          hrm_time_tracking_project_id: true,
          hrm_time_tracking_task_id: true,
          ended_at: true,
          discarded_at: true,
          employee: {
            select: {
              id: true,
            },
          },
        },
      });
    if (timerSession.employee.id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
    if (timerSession.ended_at !== null || timerSession.discarded_at !== null) {
      throw new HttpException("Timer session is no longer editable", 409);
    }
    const nextProjectId =
      props.body.hrm_time_tracking_project_id ??
      timerSession.hrm_time_tracking_project_id;
    const nextTaskId =
      props.body.hrm_time_tracking_task_id === undefined
        ? timerSession.hrm_time_tracking_task_id
        : props.body.hrm_time_tracking_task_id;
    await prisma.hrm_time_tracking_projects.findUniqueOrThrow({
      where: {
        id: nextProjectId,
      },
      select: {
        id: true,
        deleted_at: true,
        status: true,
      },
    });
    if (nextTaskId !== null) {
      const task = await prisma.hrm_time_tracking_tasks.findUniqueOrThrow({
        where: {
          id: nextTaskId,
        },
        select: {
          id: true,
          hrm_time_tracking_project_id: true,
          deleted_at: true,
        },
      });
      if (task.deleted_at !== null) {
        throw new HttpException("Task is not available", 400);
      }
      if (task.hrm_time_tracking_project_id !== nextProjectId) {
        throw new HttpException(
          "Task must belong to the selected project",
          400,
        );
      }
    }
    await prisma.hrm_time_tracking_timer_sessions.update({
      where: {
        id: props.timerSessionId,
      },
      data: {
        ...(props.body.hrm_time_tracking_project_id !== undefined && {
          project: {
            connect: {
              id: props.body.hrm_time_tracking_project_id,
            },
          },
        }),
        ...(props.body.hrm_time_tracking_task_id !== undefined && {
          task:
            props.body.hrm_time_tracking_task_id === null
              ? {
                  disconnect: true,
                }
              : {
                  connect: {
                    id: props.body.hrm_time_tracking_task_id,
                  },
                },
        }),
        ...(props.body.description !== undefined && {
          description: props.body.description,
        }),
        updated_at: new Date(),
      },
    });
    const updated =
      await prisma.hrm_time_tracking_timer_sessions.findUniqueOrThrow({
        where: {
          id: props.timerSessionId,
        },
        ...HrmTimeTrackingTimerSessionTransformer.select(),
      });
    return await HrmTimeTrackingTimerSessionTransformer.transform(updated);
  });
  return result;
}

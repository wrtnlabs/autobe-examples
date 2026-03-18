import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteHrmTimeTrackingMemberProjectsProjectIdTasksTaskId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const project = await prisma.hrm_time_tracking_projects.findFirstOrThrow({
      where: {
        id: props.projectId,
      },
      select: {
        id: true,
      },
    });
    const task = await prisma.hrm_time_tracking_tasks.findFirstOrThrow({
      where: {
        id: props.taskId,
        hrm_time_tracking_project_id: project.id,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_time_tracking_project_id: true,
        statusHistories: {
          select: {
            id: true,
          },
        },
        timelogs: {
          select: {
            id: true,
          },
        },
      },
    });
    const membership =
      await prisma.hrm_time_tracking_project_memberships.findFirst({
        where: {
          hrm_time_tracking_project_id: project.id,
          hrm_time_tracking_employee_id: props.member.id,
          deleted_at: null,
        },
        select: {
          id: true,
          is_project_lead: true,
        },
      });
    if (membership === null || membership.is_project_lead === false) {
      throw new HttpException("Forbidden", 403);
    }
    if (task.statusHistories.length > 0 || task.timelogs.length > 0) {
      throw new HttpException(
        "Task cannot be deleted because it has protected references",
        409,
      );
    }
    await prisma.hrm_time_tracking_tasks.delete({
      where: {
        id: task.id,
      },
    });
  });
}

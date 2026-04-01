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

export async function deleteErpHrmTimeMemberProjectsProjectIdTasksTaskId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
}): Promise<void> {
  const project = await MyGlobal.prisma.erp_hrm_time_projects.findUniqueOrThrow(
    {
      where: {
        id: props.projectId,
      },
      select: {
        id: true,
        erp_hrm_time_organization_id: true,
      },
    },
  );
  const task = await MyGlobal.prisma.erp_hrm_time_tasks.findUniqueOrThrow({
    where: {
      id: props.taskId,
    },
    select: {
      id: true,
      erp_hrm_time_project_id: true,
      parent_task_id: true,
    },
  });
  if (task.erp_hrm_time_project_id !== project.id) {
    throw new HttpException("Not found", 404);
  }
  const childCount = await MyGlobal.prisma.erp_hrm_time_tasks.count({
    where: {
      parent_task_id: task.id,
    },
  });
  const historyCount =
    await MyGlobal.prisma.erp_hrm_time_task_history_entries.count({
      where: {
        erp_hrm_time_task_id: task.id,
      },
    });
  const timelogCount = await MyGlobal.prisma.erp_hrm_time_timelogs.count({
    where: {
      erp_hrm_time_task_id: task.id,
    },
  });
  if (childCount > 0 || historyCount > 0 || timelogCount > 0) {
    throw new HttpException(
      "Task cannot be deleted because it is protected by related records",
      400,
    );
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.erp_hrm_time_tasks.delete({
      where: {
        id: task.id,
      },
    });
  });
}

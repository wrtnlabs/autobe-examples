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
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const project = await prisma.erp_hrm_time_projects.findUniqueOrThrow({
      where: {
        id: props.projectId,
      },
      select: {
        id: true,
      },
    });
    const task = await prisma.erp_hrm_time_tasks.findFirstOrThrow({
      where: {
        id: props.taskId,
        erp_hrm_time_project_id: project.id,
        deleted_at: null,
      },
      select: {
        id: true,
        subTasks: {
          select: {
            id: true,
          },
          take: 1,
        },
      },
    });
    if (task.subTasks.length > 0) {
      throw new HttpException(
        "Task cannot be deleted because it has subtasks",
        409,
      );
    }
    await prisma.erp_hrm_time_tasks.delete({
      where: {
        id: task.id,
      },
    });
  });
}

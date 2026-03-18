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

export async function deleteErpHrmTimeTrackingMemberProjectsProjectIdTasksTaskId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (tx) => {
    const project = await tx.erp_hrm_time_tracking_projects.findFirstOrThrow({
      where: {
        id: props.projectId,
        deleted_at: null,
      },
      select: {
        id: true,
        erp_hrm_time_tracking_organization_id: true,
        deleted_at: true,
      },
    });
    const task = await tx.erp_hrm_time_tracking_tasks.findFirstOrThrow({
      where: {
        id: props.taskId,
        deleted_at: null,
        erp_hrm_time_tracking_project_id: props.projectId,
      },
      select: {
        id: true,
      },
    });
    const nowIso = toISOStringSafe(new Date());
    await tx.erp_hrm_time_tracking_tasks.update({
      where: { id: task.id },
      data: { deleted_at: nowIso },
    });
  });
}

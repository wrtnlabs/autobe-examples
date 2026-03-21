import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmTaskHistoryTransformer } from "../transformers/ErpHrmTaskHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmAdminProjectsProjectIdTasksTaskIdHistoriesHistoryId(props: {
  admin: AdminPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  historyId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTaskHistory> {
  // Verify project exists
  await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: { id: true },
  });
  // Verify task exists and belongs to the specified project
  await MyGlobal.prisma.erp_hrm_tasks.findUniqueOrThrow({
    where: {
      id: props.taskId,
      erp_hrm_project_id: props.projectId,
    },
    select: { id: true },
  });
  // Retrieve the task history entry with member relation
  const history =
    await MyGlobal.prisma.erp_hrm_task_histories.findUniqueOrThrow({
      where: { id: props.historyId },
      ...ErpHrmTaskHistoryTransformer.select(),
    });
  // Verify history entry belongs to the specified task
  if (history.task.id !== props.taskId) {
    throw new HttpException("Task history not found", 404);
  }
  return await ErpHrmTaskHistoryTransformer.transform(history);
}

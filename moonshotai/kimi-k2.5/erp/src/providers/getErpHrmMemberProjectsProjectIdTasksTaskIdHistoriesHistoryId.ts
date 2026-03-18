import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTaskHistoryTransformer } from "../transformers/ErpHrmTaskHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberProjectsProjectIdTasksTaskIdHistoriesHistoryId(props: {
  member: MemberPayload;
  projectId: string;
  taskId: string;
  historyId: string;
}): Promise<IErpHrmTaskHistory> {
  // Verify the member has access to the project through project membership
  const projectAccess = await MyGlobal.prisma.erp_hrm_project_members.findFirst(
    {
      where: {
        project_id: props.projectId,
        organizationMember: {
          user_id: props.member.id,
        },
      },
      select: { id: true },
    },
  );
  if (projectAccess === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Retrieve the task history with validation through the query
  // First verify the task exists and belongs to the project
  const task = await MyGlobal.prisma.erp_hrm_tasks.findUnique({
    where: { id: props.taskId },
    select: { project_id: true },
  });
  if (task === null || task.project_id !== props.projectId) {
    throw new HttpException("Task not found", 404);
  }
  // Now retrieve the history entry
  const history = await MyGlobal.prisma.erp_hrm_task_histories.findUnique({
    where: { id: props.historyId },
    ...ErpHrmTaskHistoryTransformer.select(),
  });
  if (history === null) {
    throw new HttpException("Task history not found", 404);
  }
  // Validate that the history belongs to the specified task
  if (history.task.id !== props.taskId) {
    throw new HttpException("Task history not found", 404);
  }
  return await ErpHrmTaskHistoryTransformer.transform(history);
}

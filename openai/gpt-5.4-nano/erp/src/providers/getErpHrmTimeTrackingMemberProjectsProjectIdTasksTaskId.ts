import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTrackingTaskTransformer } from "../transformers/ErpHrmTimeTrackingTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeTrackingMemberProjectsProjectIdTasksTaskId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeTrackingTask> {
  const membership =
    await MyGlobal.prisma.erp_hrm_time_tracking_project_memberships.findFirst({
      where: {
        project_id: props.projectId,
        employee_id: props.member.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (membership === null) {
    throw new HttpException("Not Found", 404);
  }
  const session =
    await MyGlobal.prisma.erp_hrm_time_tracking_member_sessions.findFirst({
      where: {
        id: props.member.session_id,
      },
      select: { id: true },
    });
  if (session === null) {
    throw new HttpException("Not Found", 404);
  }
  await MyGlobal.prisma.erp_hrm_time_tracking_projects.findFirstOrThrow({
    where: {
      id: props.projectId,
      deleted_at: null,
    },
    select: { id: true },
  });
  const task =
    await MyGlobal.prisma.erp_hrm_time_tracking_tasks.findFirstOrThrow({
      where: {
        id: props.taskId,
        erp_hrm_time_tracking_project_id: props.projectId,
        deleted_at: null,
      },
      ...ErpHrmTimeTrackingTaskTransformer.select(),
    });
  return await ErpHrmTimeTrackingTaskTransformer.transform(task);
}

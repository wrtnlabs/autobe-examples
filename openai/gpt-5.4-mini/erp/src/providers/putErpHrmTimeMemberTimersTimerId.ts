import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import { IErpHrmTimeTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTimerTransformer } from "../transformers/ErpHrmTimeTimerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmTimeMemberTimersTimerId(props: {
  member: MemberPayload;
  timerId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTimer.IUpdate;
}): Promise<IErpHrmTimeTimer> {
  const timer = await MyGlobal.prisma.erp_hrm_time_timers.findUniqueOrThrow({
    where: { id: props.timerId },
    select: {
      id: true,
      member_id: true,
      employee_id: true,
      deleted_at: true,
    },
  });
  if (timer.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (timer.deleted_at !== null) {
    throw new HttpException("Timer is no longer active", 400);
  }
  const project = await MyGlobal.prisma.erp_hrm_time_projects.findUniqueOrThrow(
    {
      where: { id: props.body.project_id },
      select: {
        id: true,
        deleted_at: true,
      },
    },
  );
  if (project.deleted_at !== null) {
    throw new HttpException("Project is no longer available", 400);
  }
  if (props.body.task_id !== undefined && props.body.task_id !== null) {
    const task = await MyGlobal.prisma.erp_hrm_time_tasks.findUniqueOrThrow({
      where: { id: props.body.task_id },
      select: {
        id: true,
        erp_hrm_time_project_id: true,
        deleted_at: true,
      },
    });
    if (task.deleted_at !== null) {
      throw new HttpException("Task is no longer available", 400);
    }
    if (task.erp_hrm_time_project_id !== props.body.project_id) {
      throw new HttpException(
        "Task does not belong to the selected project",
        400,
      );
    }
  }
  await MyGlobal.prisma.erp_hrm_time_timers.update({
    where: { id: props.timerId },
    data: {
      project_id: props.body.project_id,
      task_id:
        props.body.task_id === undefined ? undefined : props.body.task_id,
      description:
        props.body.description === undefined
          ? undefined
          : props.body.description,
      updated_at: new Date(),
    },
  });
  const updated = await MyGlobal.prisma.erp_hrm_time_timers.findUniqueOrThrow({
    where: { id: props.timerId },
    ...ErpHrmTimeTimerTransformer.select(),
  });
  return await ErpHrmTimeTimerTransformer.transform(updated);
}

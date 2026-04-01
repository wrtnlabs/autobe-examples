import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import { IErpHrmTimeTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTimelogTransformer } from "../transformers/ErpHrmTimeTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmTimeMemberTimelogsTimelogId(props: {
  member: MemberPayload;
  timelogId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTimelog.IUpdate;
}): Promise<IErpHrmTimeTimelog> {
  const timelog = await MyGlobal.prisma.erp_hrm_time_timelogs.findUniqueOrThrow(
    {
      where: { id: props.timelogId },
      select: {
        id: true,
        erp_hrm_time_member_id: true,
        erp_hrm_time_project_id: true,
        erp_hrm_time_task_id: true,
        work_date: true,
        duration_minutes: true,
        description: true,
        billable: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );
  if (timelog.erp_hrm_time_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (timelog.deleted_at !== null) {
    throw new HttpException("Timelog is deleted", 400);
  }
  const lockedProjectStatuses = new Set<string>([
    "approved",
    "completed",
    "archived",
  ]);
  const currentProject =
    await MyGlobal.prisma.erp_hrm_time_projects.findFirstOrThrow({
      where: {
        id: timelog.erp_hrm_time_project_id,
        deleted_at: null,
      },
      select: {
        id: true,
        erp_hrm_time_organization_id: true,
        status: true,
        deleted_at: true,
      },
    });
  if (lockedProjectStatuses.has(currentProject.status)) {
    throw new HttpException("Timelog is locked", 400);
  }
  const currentMember = props.member;
  const projectId =
    props.body.erp_hrm_time_project_id ?? timelog.erp_hrm_time_project_id;
  const taskId =
    props.body.erp_hrm_time_task_id === undefined
      ? timelog.erp_hrm_time_task_id
      : props.body.erp_hrm_time_task_id;
  if (props.body.erp_hrm_time_project_id !== undefined) {
    await MyGlobal.prisma.erp_hrm_time_projects.findFirstOrThrow({
      where: {
        id: props.body.erp_hrm_time_project_id,
        erp_hrm_time_organization_id:
          currentProject.erp_hrm_time_organization_id,
        deleted_at: null,
      },
      select: { id: true },
    });
  }
  if (props.body.erp_hrm_time_task_id !== undefined) {
    if (props.body.erp_hrm_time_task_id !== null) {
      await MyGlobal.prisma.erp_hrm_time_tasks.findFirstOrThrow({
        where: {
          id: props.body.erp_hrm_time_task_id,
          erp_hrm_time_project_id: projectId,
          deleted_at: null,
        },
        select: { id: true },
      });
    }
  } else if (taskId !== null) {
    await MyGlobal.prisma.erp_hrm_time_tasks.findFirstOrThrow({
      where: {
        id: taskId,
        erp_hrm_time_project_id: projectId,
        deleted_at: null,
      },
      select: { id: true },
    });
  }
  await MyGlobal.prisma.erp_hrm_time_timelogs.update({
    where: { id: props.timelogId },
    data: {
      ...(props.body.work_date !== undefined && {
        work_date: new Date(props.body.work_date),
      }),
      ...(props.body.duration_minutes !== undefined && {
        duration_minutes: props.body.duration_minutes,
      }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.billable !== undefined && {
        billable: props.body.billable,
      }),
      ...(props.body.erp_hrm_time_project_id !== undefined && {
        erp_hrm_time_project_id: props.body.erp_hrm_time_project_id,
      }),
      ...(props.body.erp_hrm_time_task_id !== undefined && {
        erp_hrm_time_task_id: props.body.erp_hrm_time_task_id,
      }),
      updated_at: new Date(),
    },
  });
  const updated = await MyGlobal.prisma.erp_hrm_time_timelogs.findUniqueOrThrow(
    {
      where: { id: props.timelogId },
      ...ErpHrmTimeTimelogTransformer.select(),
    },
  );
  return await ErpHrmTimeTimelogTransformer.transform(updated);
}

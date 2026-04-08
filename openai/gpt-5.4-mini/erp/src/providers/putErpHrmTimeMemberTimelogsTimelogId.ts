import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
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
      where: {
        id: props.timelogId,
      },
      select: {
        id: true,
        erp_hrm_time_member_id: true,
        erp_hrm_time_project_id: true,
        erp_hrm_time_task_id: true,
        work_date: true,
        duration_minutes: true,
        description: true,
        billable: true,
        deleted_at: true,
        project: {
          select: {
            id: true,
            erp_hrm_time_organization_id: true,
            status: true,
          },
        },
      },
    },
  );
  if (timelog.erp_hrm_time_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const lockedTimelog =
    await MyGlobal.prisma.erp_hrm_time_timesheet_timelogs.findFirst({
      where: {
        erp_hrm_time_timelog_id: props.timelogId,
        timesheet: {
          status: {
            in: ["submitted", "approved"],
          },
        },
      },
      select: {
        id: true,
      },
    });
  if (lockedTimelog !== null) {
    throw new HttpException(
      "Timelog is locked by an approved or submitted timesheet",
      409,
    );
  }
  const targetProjectId: string & tags.Format<"uuid"> =
    props.body.erp_hrm_time_project_id ?? timelog.erp_hrm_time_project_id;
  const targetTaskId: (string & tags.Format<"uuid">) | null =
    props.body.erp_hrm_time_task_id === undefined
      ? timelog.erp_hrm_time_task_id
      : props.body.erp_hrm_time_task_id;
  const targetProject =
    targetProjectId === timelog.erp_hrm_time_project_id
      ? timelog.project
      : await MyGlobal.prisma.erp_hrm_time_projects.findUniqueOrThrow({
          where: {
            id: targetProjectId,
          },
          select: {
            id: true,
            erp_hrm_time_organization_id: true,
            status: true,
          },
        });
  if (
    targetProject.erp_hrm_time_organization_id !==
    timelog.project.erp_hrm_time_organization_id
  ) {
    throw new HttpException("Project is outside the active organization", 400);
  }
  if (
    (targetProject.status === "archived" ||
      targetProject.status === "completed") &&
    targetProjectId !== timelog.erp_hrm_time_project_id
  ) {
    throw new HttpException(
      "Archived or completed projects do not accept new timelogs",
      400,
    );
  }
  if (targetTaskId !== null) {
    const targetTask =
      await MyGlobal.prisma.erp_hrm_time_tasks.findUniqueOrThrow({
        where: {
          id: targetTaskId,
        },
        select: {
          id: true,
          erp_hrm_time_project_id: true,
        },
      });
    if (targetTask.erp_hrm_time_project_id !== targetProjectId) {
      throw new HttpException(
        "Task does not belong to the selected project",
        400,
      );
    }
  }
  await MyGlobal.prisma.erp_hrm_time_timelogs.update({
    where: {
      id: props.timelogId,
    },
    data: {
      ...(props.body.work_date !== undefined && {
        work_date: toISOStringSafe(props.body.work_date),
      }),
      ...(props.body.duration_minutes !== undefined && {
        duration_minutes: props.body.duration_minutes,
      }),
      ...(props.body.erp_hrm_time_project_id !== undefined && {
        erp_hrm_time_project_id: props.body.erp_hrm_time_project_id,
      }),
      ...(props.body.erp_hrm_time_task_id !== undefined && {
        erp_hrm_time_task_id: props.body.erp_hrm_time_task_id,
      }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.billable !== undefined && {
        billable: props.body.billable,
      }),
      updated_at: toISOStringSafe(new Date().toISOString()),
    },
  });
  const updated = await MyGlobal.prisma.erp_hrm_time_timelogs.findUniqueOrThrow(
    {
      where: {
        id: props.timelogId,
      },
      ...ErpHrmTimeTimelogTransformer.select(),
    },
  );
  return ErpHrmTimeTimelogTransformer.transform(updated);
}

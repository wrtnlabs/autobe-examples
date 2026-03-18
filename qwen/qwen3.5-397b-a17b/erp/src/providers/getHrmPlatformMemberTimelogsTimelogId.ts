import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformEmployeeAtSummaryTransformer } from "../transformers/HrmPlatformEmployeeAtSummaryTransformer";
import { HrmPlatformProjectAtSummaryTransformer } from "../transformers/HrmPlatformProjectAtSummaryTransformer";
import { HrmPlatformTaskAtSummaryTransformer } from "../transformers/HrmPlatformTaskAtSummaryTransformer";
import { HrmPlatformTimesheetAtSummaryTransformer } from "../transformers/HrmPlatformTimesheetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberTimelogsTimelogId(props: {
  member: MemberPayload;
  timelogId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformTimelog> {
  const timelog = await MyGlobal.prisma.hrm_platform_timelogs.findUniqueOrThrow(
    {
      where: {
        id: props.timelogId,
        deleted_at: null,
      },
      select: {
        id: true,
        employee_id: true,
        date: true,
        duration_minutes: true,
        description: true,
        billable: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employee: HrmPlatformEmployeeAtSummaryTransformer.select(),
        project: HrmPlatformProjectAtSummaryTransformer.select(),
        task: HrmPlatformTaskAtSummaryTransformer.select(),
        timesheet: HrmPlatformTimesheetAtSummaryTransformer.select(),
      },
    },
  );
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: { id: timelog.employee_id },
      select: {
        id: true,
        member_id: true,
        role: {
          select: {
            id: true,
            permissions: {
              select: {
                permission: true,
              },
            },
          },
        },
      },
    });
  const isOwner = employee.member_id === props.member.id;
  const hasViewAllPermission = employee.role.permissions.some(
    (p: { permission: string }) => p.permission === "time:view_all",
  );
  if (!isOwner && !hasViewAllPermission) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: timelog.id,
    employee: await HrmPlatformEmployeeAtSummaryTransformer.transform(
      timelog.employee,
    ),
    project: await HrmPlatformProjectAtSummaryTransformer.transform(
      timelog.project,
    ),
    task: timelog.task
      ? await HrmPlatformTaskAtSummaryTransformer.transform(timelog.task)
      : null,
    timesheet: timelog.timesheet
      ? await HrmPlatformTimesheetAtSummaryTransformer.transform(
          timelog.timesheet,
        )
      : null,
    date: toISOStringSafe(timelog.date),
    duration_minutes: timelog.duration_minutes,
    description: timelog.description ?? null,
    billable: timelog.billable,
    created_at: toISOStringSafe(timelog.created_at),
    updated_at: toISOStringSafe(timelog.updated_at),
  };
}

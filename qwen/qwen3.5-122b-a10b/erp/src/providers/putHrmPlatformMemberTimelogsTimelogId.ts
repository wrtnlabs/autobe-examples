import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimelogTransformer } from "../transformers/HrmPlatformTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberTimelogsTimelogId(props: {
  member: MemberPayload;
  timelogId: string & tags.Format<"uuid">;
  body: IHrmPlatformTimelog.IUpdate;
}): Promise<IHrmPlatformTimelog> {
  // 1. Verify timelog exists and is not soft deleted
  const timelog = await MyGlobal.prisma.hrm_platform_timelogs.findUniqueOrThrow(
    {
      where: {
        id: props.timelogId,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_platform_employee_id: true,
        hrm_platform_project_id: true,
        deleted_at: true,
      },
    },
  );
  // 2. Check if timelog is locked by an approved timesheet
  const lockedEntry =
    await MyGlobal.prisma.hrm_platform_timesheet_timelogs.findFirst({
      where: {
        hrm_platform_timelog_id: props.timelogId,
        timesheet: {
          status: "approved",
          deleted_at: null,
        },
      },
      select: {
        id: true,
      },
    });
  if (lockedEntry !== null) {
    throw new HttpException("Timelog is locked by an approved timesheet", 400);
  }
  // 3. Check project status (must not be archived or completed)
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: {
        id: timelog.hrm_platform_project_id,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
      },
    },
  );
  if (project.status === "archived" || project.status === "completed") {
    throw new HttpException(
      "Cannot update timelog for archived or completed project",
      400,
    );
  }
  // 4. Find the employee record for the authenticated member - include role_id
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_platform_organization_id: true,
      hrm_platform_role_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee record not found", 403);
  }
  // 5. Check ownership: employee owns timelog OR has time:manage permission
  const isOwner = timelog.hrm_platform_employee_id === employee.id;
  if (!isOwner) {
    // Check for time:manage permission via role_permissions
    const hasTimeManagePermission =
      await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
        where: {
          hrm_platform_role_id: employee.hrm_platform_role_id,
          permission: {
            code: "time:manage",
          },
        },
        select: {
          id: true,
        },
      });
    if (hasTimeManagePermission === null) {
      throw new HttpException(
        "Forbidden: You can only update your own timelogs",
        403,
      );
    }
  }
  // 6. Update the timelog with provided fields
  await MyGlobal.prisma.hrm_platform_timelogs.update({
    where: {
      id: props.timelogId,
    },
    data: {
      ...(props.body.date !== undefined && {
        date: new Date(props.body.date),
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
      updated_at: new Date(),
    },
  });
  // 7. Fetch and return the updated timelog
  const updated = await MyGlobal.prisma.hrm_platform_timelogs.findUniqueOrThrow(
    {
      where: {
        id: props.timelogId,
      },
      ...HrmPlatformTimelogTransformer.select(),
    },
  );
  return await HrmPlatformTimelogTransformer.transform(updated);
}

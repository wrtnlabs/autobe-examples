import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
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
import { HrmPlatformTimelogTransformer } from "../transformers/HrmPlatformTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberTimelogsTimelogId(props: {
  member: MemberPayload;
  timelogId: string & tags.Format<"uuid">;
  body: IHrmPlatformTimelog.IUpdate;
}): Promise<IHrmPlatformTimelog> {
  const existingTimelog =
    await MyGlobal.prisma.hrm_platform_timelogs.findUniqueOrThrow({
      where: {
        id: props.timelogId,
        deleted_at: null,
      },
      select: {
        hrm_platform_employee_id: true,
        hrm_platform_project_id: true,
        employee: {
          select: {
            hrm_platform_member_id: true,
            organization: {
              select: {
                id: true,
              },
            },
          },
        },
        timesheet: {
          select: {
            status: true,
          },
        },
      },
    });
  const organizationId = existingTimelog.employee.organization.id;
  const requestingMemberEmployee =
    await MyGlobal.prisma.hrm_platform_employees.findFirst({
      where: {
        hrm_platform_member_id: props.member.id,
        hrm_platform_organization_id: organizationId,
        deleted_at: null,
      },
      select: {
        role: {
          select: {
            rolePermissions: {
              select: {
                permission_key: true,
              },
            },
          },
        },
      },
    });
  const hasTimeManage =
    requestingMemberEmployee?.role.rolePermissions.some(
      (p: { permission_key: string }) => p.permission_key === "time:manage",
    ) ?? false;
  const isOwner =
    existingTimelog.employee.hrm_platform_member_id === props.member.id;
  if (!isOwner && !hasTimeManage) {
    throw new HttpException("Forbidden", 403);
  }
  if (existingTimelog.timesheet !== null) {
    if (existingTimelog.timesheet.status === "approved") {
      throw new HttpException(
        "Cannot edit timelog included in an approved timesheet",
        400,
      );
    }
    if (existingTimelog.timesheet.status === "submitted" && !hasTimeManage) {
      throw new HttpException(
        "Cannot edit timelog included in a submitted timesheet",
        400,
      );
    }
  }
  let targetProjectId: string;
  if (
    props.body.projectId !== undefined &&
    props.body.projectId !== existingTimelog.hrm_platform_project_id
  ) {
    const targetProject =
      await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow({
        where: {
          id: props.body.projectId,
          deleted_at: null,
        },
        select: {
          status: true,
        },
      });
    if (
      targetProject.status === "archived" ||
      targetProject.status === "completed"
    ) {
      throw new HttpException(
        "Cannot assign timelog to an archived or completed project",
        400,
      );
    }
    const membershipExists =
      await MyGlobal.prisma.hrm_platform_project_memberships.findFirst({
        where: {
          hrm_platform_employee_id: existingTimelog.hrm_platform_employee_id,
          hrm_platform_project_id: props.body.projectId,
          deleted_at: null,
        },
      });
    if (membershipExists === null) {
      throw new HttpException(
        "Employee is not a member of the target project",
        400,
      );
    }
    targetProjectId = props.body.projectId;
  } else {
    targetProjectId = existingTimelog.hrm_platform_project_id;
  }
  if (props.body.taskId !== undefined && props.body.taskId !== null) {
    const targetTask =
      await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
        where: {
          id: props.body.taskId,
          deleted_at: null,
        },
        select: {
          hrm_platform_project_id: true,
        },
      });
    if (targetTask.hrm_platform_project_id !== targetProjectId) {
      throw new HttpException(
        "Task does not belong to the timelog's project",
        400,
      );
    }
  }
  if (props.body.employeeId !== undefined) {
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: {
        id: props.body.employeeId,
        deleted_at: null,
        hrm_platform_organization_id: organizationId,
      },
    });
  }
  await MyGlobal.prisma.hrm_platform_timelogs.update({
    where: { id: props.timelogId },
    data: {
      ...(props.body.date !== undefined && {
        date: new Date(props.body.date),
      }),
      ...(props.body.durationMinutes !== undefined && {
        duration_minutes: props.body.durationMinutes,
      }),
      ...(props.body.workDescription !== undefined && {
        work_description: props.body.workDescription,
      }),
      ...(props.body.billable !== undefined && {
        billable: props.body.billable,
      }),
      ...(props.body.projectId !== undefined && {
        project: { connect: { id: props.body.projectId } },
      }),
      ...(props.body.taskId !== undefined && {
        task:
          props.body.taskId === null
            ? { disconnect: true }
            : { connect: { id: props.body.taskId } },
      }),
      ...(props.body.employeeId !== undefined && {
        employee: { connect: { id: props.body.employeeId } },
      }),
    },
  });
  const updatedTimelog =
    await MyGlobal.prisma.hrm_platform_timelogs.findUniqueOrThrow({
      where: { id: props.timelogId },
      ...HrmPlatformTimelogTransformer.select(),
    });
  return await HrmPlatformTimelogTransformer.transform(updatedTimelog);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
// import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
// import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putHrmPlatformMemberTimelogsTimelogId(props: {
//   member: MemberPayload;
//   timelogId: string & tags.Format<"uuid">;
//   body: IHrmPlatformTimelog.IUpdate;
// }): Promise<IHrmPlatformTimelog> {
//   await MyGlobal.prisma.hrm_platform_timelogs.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_platform_timelogs.findUniqueOrThrow({
//     where: { ... },
//     ...HrmPlatformTimelogTransformer.select(),
//   });
//   return await HrmPlatformTimelogTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------
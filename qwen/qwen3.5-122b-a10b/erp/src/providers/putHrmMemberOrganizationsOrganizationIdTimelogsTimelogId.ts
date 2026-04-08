import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimelogTransformer } from "../transformers/HrmTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmMemberOrganizationsOrganizationIdTimelogsTimelogId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  timelogId: string & tags.Format<"uuid">;
  body: IHrmTimelog.IUpdate;
}): Promise<IHrmTimelog> {
  const timelog = await MyGlobal.prisma.hrm_timelogs.findUnique({
    where: { id: props.timelogId },
    select: {
      id: true,
      hrm_employee_id: true,
      hrm_project_id: true,
      hrm_task_id: true,
      project: {
        select: {
          hrm_organization_id: true,
        },
      } satisfies Prisma.hrm_projectsFindManyArgs,
    },
  });
  if (!timelog) {
    throw new HttpException("Timelog not found", 404);
  }
  if (timelog.project.hrm_organization_id !== props.organizationId) {
    throw new HttpException("Timelog does not belong to organization", 403);
  }
  const timesheetTimelog =
    await MyGlobal.prisma.hrm_timesheet_timelogs.findFirst({
      where: {
        timelog_id: props.timelogId,
        deleted_at: null,
        timesheet: {
          status: "approved",
          deleted_at: null,
        },
      },
      select: {
        id: true,
      },
    });
  if (timesheetTimelog) {
    throw new HttpException("Cannot update timelog in approved timesheet", 403);
  }
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      id: timelog.hrm_employee_id,
      user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.hrm_task_id !== undefined) {
    const targetProjectId = props.body.hrm_project_id ?? timelog.hrm_project_id;
    if (props.body.hrm_task_id !== null) {
      const task = await MyGlobal.prisma.hrm_tasks.findFirst({
        where: {
          id: props.body.hrm_task_id,
          project_id: targetProjectId,
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
      if (!task) {
        throw new HttpException("Task does not belong to the project", 400);
      }
    }
  }
  await MyGlobal.prisma.hrm_timelogs.update({
    where: { id: props.timelogId },
    data: {
      ...(props.body.hrm_project_id !== undefined && {
        hrm_project_id: props.body.hrm_project_id,
      }),
      ...(props.body.hrm_task_id !== undefined && {
        hrm_task_id: props.body.hrm_task_id,
      }),
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
  const updated = await MyGlobal.prisma.hrm_timelogs.findUniqueOrThrow({
    where: { id: props.timelogId },
    ...HrmTimelogTransformer.select(),
  });
  return await HrmTimelogTransformer.transform(updated);
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
// import { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
// import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
// import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
// import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
// import { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putHrmMemberOrganizationsOrganizationIdTimelogsTimelogId(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   timelogId: string & tags.Format<"uuid">;
//   body: IHrmTimelog.IUpdate;
// }): Promise<IHrmTimelog> {
//   await MyGlobal.prisma.hrm_timelogs.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_timelogs.findUniqueOrThrow({
//     where: { ... },
//     ...HrmTimelogTransformer.select(),
//   });
//   return await HrmTimelogTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------
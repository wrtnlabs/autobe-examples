import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteErpHrmMemberTimelogsTimelogId(props: {
  member: MemberPayload;
  timelogId: string & tags.Format<"uuid">;
}): Promise<void> {
  const timelog = await MyGlobal.prisma.erp_hrm_timelogs.findUniqueOrThrow({
    where: {
      id: props.timelogId,
      deleted_at: null,
    },
    select: {
      id: true,
      employee_id: true,
      timesheet_id: true,
      employee: {
        select: {
          id: true,
          erp_hrm_organization_id: true,
        },
      },
    },
  });
  const session = await MyGlobal.prisma.erp_hrm_member_sessions.findFirst({
    where: { id: props.member.session_id },
    select: { erp_hrm_organization_id: true },
  });
  if (session === null || session.erp_hrm_organization_id === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (
    timelog.employee.erp_hrm_organization_id !== session.erp_hrm_organization_id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const currentEmployee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: session.erp_hrm_organization_id,
      deleted_at: null,
      status: "active",
    },
    select: {
      id: true,
      erp_hrm_role_id: true,
      role: {
        select: {
          name: true,
          is_builtin: true,
        },
      },
    },
  });
  if (currentEmployee === null) {
    throw new HttpException("Forbidden", 403);
  }
  const isOwner = currentEmployee.id === timelog.employee_id;
  let hasTimeManage = false;
  if (currentEmployee.role.is_builtin) {
    hasTimeManage =
      currentEmployee.role.name === "Owner" ||
      currentEmployee.role.name === "Manager";
  } else {
    const permission = await MyGlobal.prisma.erp_hrm_role_permissions.findFirst(
      {
        where: {
          erp_hrm_role_id: currentEmployee.erp_hrm_role_id,
          permission: {
            key: "time:manage",
          },
        },
      },
    );
    hasTimeManage = permission !== null;
  }
  if (!isOwner && !hasTimeManage) {
    throw new HttpException("Forbidden", 403);
  }
  if (timelog.timesheet_id !== null) {
    const timesheet =
      await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
        where: { id: timelog.timesheet_id },
        select: { status: true },
      });
    if (timesheet.status === "approved") {
      throw new HttpException(
        "Timelog is locked by an approved timesheet",
        422,
      );
    }
    if (timesheet.status === "submitted" && !hasTimeManage) {
      throw new HttpException(
        "Timelog cannot be deleted while under review",
        422,
      );
    }
  }
  await MyGlobal.prisma.erp_hrm_timelogs.update({
    where: { id: props.timelogId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteErpHrmMemberTimelogsTimelogId(props: {
//   member: MemberPayload;
//   timelogId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------
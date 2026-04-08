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

export async function getHrmMemberTimelogsTimelogId(props: {
  member: MemberPayload;
  timelogId: string & tags.Format<"uuid">;
}): Promise<IHrmTimelog> {
  // Find the timelog to get employee reference
  const timelog = await MyGlobal.prisma.hrm_timelogs.findFirstOrThrow({
    where: {
      id: props.timelogId,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_employee_id: true,
    },
  });
  // Get the employee record to check organization and role
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      id: timelog.hrm_employee_id,
      deleted_at: null,
    },
    select: {
      id: true,
      organization_id: true,
      role_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Forbidden", 403);
  }
  // Get the member's employee record in the same organization
  const memberEmployee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      user_id: props.member.id,
      organization_id: employee.organization_id,
      deleted_at: null,
    },
  });
  if (memberEmployee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Check ownership or permission
  const isOwner = timelog.hrm_employee_id === memberEmployee.id;
  if (!isOwner) {
    // Check for time:view_all or time:manage permission
    const rolePermissions = await MyGlobal.prisma.hrm_role_permissions.findMany(
      {
        where: {
          hrm_role_id: memberEmployee.role_id,
        },
        select: {
          hrm_permission_id: true,
        },
      },
    );
    const permissionIds = rolePermissions.map((rp) => rp.hrm_permission_id);
    if (permissionIds.length === 0) {
      throw new HttpException("Forbidden", 403);
    }
    // Get permission names to check for time:view_all or time:manage
    const permissions = await MyGlobal.prisma.hrm_permissions.findMany({
      where: {
        id: {
          in: permissionIds,
        },
      },
      select: {
        permission_name: true,
      },
    });
    const hasViewAll = permissions.some(
      (p) => p.permission_name === "time:view_all",
    );
    const hasManage = permissions.some(
      (p) => p.permission_name === "time:manage",
    );
    if (!hasViewAll && !hasManage) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Fetch the full timelog with all relations using transformer
  const record = await MyGlobal.prisma.hrm_timelogs.findUniqueOrThrow({
    where: {
      id: props.timelogId,
    },
    ...HrmTimelogTransformer.select(),
  });
  return await HrmTimelogTransformer.transform(record);
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
// export async function getHrmMemberTimelogsTimelogId(props: {
//   member: MemberPayload;
//   timelogId: string & tags.Format<"uuid">;
// }): Promise<IHrmTimelog> {
//   const record = await MyGlobal.prisma.hrm_timelogs.findFirstOrThrow({
//     ...HrmTimelogTransformer.select(),
//     where: { ... },
//   });
//   return await HrmTimelogTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------